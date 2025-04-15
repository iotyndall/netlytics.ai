import { supabase } from './supabase';
import { Profile, Connection, UploadLog, DashboardStats } from '../types';

/**
 * Create or update a profile in the database
 */
export const upsertProfile = async (profile: Profile): Promise<Profile | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .upsert({
      full_name: profile.full_name,
      linkedin_url: profile.linkedin_url,
      email: profile.email,
      company: profile.company,
      title: profile.title,
    }, {
      onConflict: 'linkedin_url',
      ignoreDuplicates: false,
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error upserting profile:', error);
    return null;
  }
  
  return data;
};

/**
 * Batch upsert profiles
 */
export const upsertProfiles = async (profiles: Profile[]): Promise<Profile[]> => {
  const { data, error } = await supabase
    .from('profiles')
    .upsert(
      profiles.map(profile => ({
        full_name: profile.full_name,
        linkedin_url: profile.linkedin_url,
        email: profile.email,
        company: profile.company,
        title: profile.title,
      })),
      {
        onConflict: 'linkedin_url',
        ignoreDuplicates: false,
      }
    )
    .select();
  
  if (error) {
    console.error('Error batch upserting profiles:', error);
    return [];
  }
  
  return data || [];
};

/**
 * Create or update a connection between a user and a profile
 */
export const createConnection = async (
  userId: string,
  profileId: string,
  connectedOn: string
): Promise<Connection | null> => {
  const { data, error } = await supabase
    .from('connections')
    .upsert({
      user_id: userId,
      profile_id: profileId,
      connected_on: connectedOn,
    }, {
      onConflict: 'user_id,profile_id',
      ignoreDuplicates: false,
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error creating/updating connection:', error);
    return null;
  }
  
  return data;
};

/**
 * Batch insert or update connections
 */
export const batchInsertConnections = async (
  connections: { user_id: string; profile_id: string; connected_on: string }[]
): Promise<Connection[]> => {
  console.log(`Attempting to upsert ${connections.length} connections`);
  
  // Use upsert instead of insert to handle existing connections
  const { data, error } = await supabase
    .from('connections')
    .upsert(connections, {
      onConflict: 'user_id,profile_id', // Match the unique constraint in the database
      ignoreDuplicates: false, // Update existing records
    })
    .select();
  
  if (error) {
    console.error('Error batch upserting connections:', error);
    return [];
  }
  
  console.log(`Successfully upserted ${data?.length || 0} connections`);
  
  return data || [];
};

/**
 * Log an upload
 */
export const logUpload = async (
  userId: string,
  numProfiles: number,
  numConnections: number
): Promise<UploadLog | null> => {
  const { data, error } = await supabase
    .from('upload_logs')
    .insert({
      user_id: userId,
      num_profiles: numProfiles,
      num_connections: numConnections,
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error logging upload:', error);
    return null;
  }
  
  return data;
};

/**
 * Get all connections for a user
 */
export const getUserConnections = async (userId: string): Promise<Connection[]> => {
  const { data, error } = await supabase
    .from('connections')
    .select(`
      *,
      profiles:profile_id (*)
    `)
    .eq('user_id', userId);
  
  if (error) {
    console.error('Error fetching user connections:', error);
    return [];
  }
  
  return data || [];
};

/**
 * Get dashboard stats for a user
 */
export const getDashboardStats = async (userId: string): Promise<DashboardStats | null> => {
  // Get total connections
  const { count: totalConnections, error: countError } = await supabase
    .from('connections')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);
  
  if (countError) {
    console.error('Error counting connections:', countError);
    return null;
  }
  
  // Get connections by year
  const { data: yearData, error: yearError } = await supabase
    .rpc('get_connections_by_year', { user_id_param: userId });
  
  if (yearError) {
    console.error('Error getting connections by year:', yearError);
    return null;
  }
  
  // Get top companies
  const { data: companyData, error: companyError } = await supabase
    .rpc('get_top_companies', { user_id_param: userId, limit_param: 10 });
  
  if (companyError) {
    console.error('Error getting top companies:', companyError);
    return null;
  }
  
  // Get top titles
  const { data: titleData, error: titleError } = await supabase
    .rpc('get_top_titles', { user_id_param: userId, limit_param: 10 });
  
  if (titleError) {
    console.error('Error getting top titles:', titleError);
    return null;
  }
  
  // Format the data
  const connectionsByYear: Record<string, number> = {};
  yearData?.forEach((item: any) => {
    connectionsByYear[item.year] = item.count;
  });
  
  const topCompanies = companyData?.map((item: any) => ({
    company: item.company,
    count: item.count,
  })) || [];
  
  const topTitles = titleData?.map((item: any) => ({
    title: item.title,
    count: item.count,
  })) || [];
  
  return {
    totalConnections: totalConnections || 0,
    connectionsByYear,
    topCompanies,
    topTitles,
  };
};

/**
 * Search connections
 */
export const searchConnections = async (
  userId: string,
  query: string,
  filters: Record<string, any> = {}
): Promise<Connection[]> => {
  let queryBuilder = supabase
    .from('connections')
    .select(`
      *,
      profiles:profile_id (*)
    `)
    .eq('user_id', userId);
  
  // Apply text search if provided
  if (query) {
    queryBuilder = queryBuilder.or(
      `profiles.full_name.ilike.%${query}%,profiles.company.ilike.%${query}%,profiles.title.ilike.%${query}%`
    );
  }
  
  // Apply filters
  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      if (key === 'connected_on_start') {
        queryBuilder = queryBuilder.gte('connected_on', value);
      } else if (key === 'connected_on_end') {
        queryBuilder = queryBuilder.lte('connected_on', value);
      } else if (key.startsWith('profiles.')) {
        queryBuilder = queryBuilder.eq(key, value);
      }
    }
  });
  
  const { data, error } = await queryBuilder;
  
  if (error) {
    console.error('Error searching connections:', error);
    return [];
  }
  
  return data || [];
};
