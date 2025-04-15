import { supabase } from './supabase';
import { Profile, GnnNode, GnnEdge, GnnNodeProfile, GnnPrediction } from '../types';

/**
 * Create a GNN node from a profile
 */
export const createNodeFromProfile = async (profile: Profile, userId: string): Promise<GnnNode | null> => {
  try {
    // Generate a unique node ID
    const nodeId = `profile_${profile.id}`;
    
    // Create the node
    const { data, error } = await supabase
      .from('gnn_nodes')
      .upsert({
        node_id: nodeId,
        type: 'profile',
        source_user_ids: [userId],
      }, {
        onConflict: 'node_id',
        ignoreDuplicates: false,
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating GNN node:', error);
      return null;
    }
    
    // Create the node-profile mapping
    const { error: mappingError } = await supabase
      .from('gnn_node_profiles')
      .upsert({
        node_id: nodeId,
        profile_id: profile.id,
        user_id: userId,
      }, {
        onConflict: 'node_id,profile_id,user_id',
        ignoreDuplicates: true,
      });
    
    if (mappingError) {
      console.error('Error creating GNN node-profile mapping:', mappingError);
    }
    
    return data;
  } catch (error) {
    console.error('Error in createNodeFromProfile:', error);
    return null;
  }
};

/**
 * Create a GNN edge between two nodes
 */
export const createEdge = async (
  sourceId: string,
  targetId: string,
  edgeType: 'connection' | 'affiliation' | 'title_similarity' | 'mutual',
  weight: number = 1.0,
  properties: Record<string, any> = {}
): Promise<GnnEdge | null> => {
  try {
    const { data, error } = await supabase
      .from('gnn_edges')
      .insert({
        source_id: sourceId,
        target_id: targetId,
        edge_type: edgeType,
        weight,
        properties,
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating GNN edge:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error in createEdge:', error);
    return null;
  }
};

/**
 * Create a connection edge between a user and a profile
 */
export const createConnectionEdge = async (userId: string, profileId: string): Promise<GnnEdge | null> => {
  try {
    // Get the user node
    const userNodeId = `user_${userId}`;
    
    // Get the profile node
    const { data: profileNode, error: profileNodeError } = await supabase
      .from('gnn_node_profiles')
      .select('node_id')
      .eq('profile_id', profileId)
      .single();
    
    if (profileNodeError) {
      console.error('Error getting profile node:', profileNodeError);
      return null;
    }
    
    // Create the edge
    return createEdge(userNodeId, profileNode.node_id, 'connection');
  } catch (error) {
    console.error('Error in createConnectionEdge:', error);
    return null;
  }
};

/**
 * Create affiliation edges between profiles with the same company
 */
export const createAffiliationEdges = async (userId: string): Promise<number> => {
  try {
    // Get all profiles for the user
    const { data: connections, error: connectionsError } = await supabase
      .from('connections')
      .select(`
        profile_id,
        profiles:profile_id (*)
      `)
      .eq('user_id', userId);
    
    if (connectionsError) {
      console.error('Error getting connections:', connectionsError);
      return 0;
    }
    
    // Group profiles by company
    const profilesByCompany: Record<string, Profile[]> = {};
    
    connections.forEach((connection: any) => {
      const profile = connection.profiles as Profile;
      if (profile.company) {
        if (!profilesByCompany[profile.company]) {
          profilesByCompany[profile.company] = [];
        }
        profilesByCompany[profile.company].push(profile);
      }
    });
    
    // Create edges between profiles in the same company
    let edgesCreated = 0;
    
    for (const company in profilesByCompany) {
      const profiles = profilesByCompany[company];
      
      if (profiles.length > 1) {
        // Get node IDs for all profiles
        const { data: nodeProfiles, error: nodeProfilesError } = await supabase
          .from('gnn_node_profiles')
          .select('node_id, profile_id')
          .in('profile_id', profiles.map(p => p.id));
        
        if (nodeProfilesError) {
          console.error('Error getting node profiles:', nodeProfilesError);
          continue;
        }
        
        // Create a map of profile ID to node ID
        const profileToNodeMap: Record<string, string> = {};
        nodeProfiles.forEach(np => {
          profileToNodeMap[np.profile_id] = np.node_id;
        });
        
        // Create edges between all pairs of profiles
        for (let i = 0; i < profiles.length; i++) {
          for (let j = i + 1; j < profiles.length; j++) {
            const sourceNodeId = profileToNodeMap[profiles[i].id];
            const targetNodeId = profileToNodeMap[profiles[j].id];
            
            if (sourceNodeId && targetNodeId) {
              const edge = await createEdge(
                sourceNodeId,
                targetNodeId,
                'affiliation',
                1.0,
                { company }
              );
              
              if (edge) {
                edgesCreated++;
              }
            }
          }
        }
      }
    }
    
    return edgesCreated;
  } catch (error) {
    console.error('Error in createAffiliationEdges:', error);
    return 0;
  }
};

/**
 * Create title similarity edges between profiles with similar titles
 */
export const createTitleSimilarityEdges = async (userId: string, similarityThreshold: number = 0.7): Promise<number> => {
  try {
    // Get all profiles for the user
    const { data: connections, error: connectionsError } = await supabase
      .from('connections')
      .select(`
        profile_id,
        profiles:profile_id (*)
      `)
      .eq('user_id', userId);
    
    if (connectionsError) {
      console.error('Error getting connections:', connectionsError);
      return 0;
    }
    
    // Group profiles by job function
    const profilesByFunction: Record<string, Profile[]> = {};
    
    connections.forEach((connection: any) => {
      const profile = connection.profiles as Profile;
      if (profile.job_function) {
        if (!profilesByFunction[profile.job_function]) {
          profilesByFunction[profile.job_function] = [];
        }
        profilesByFunction[profile.job_function].push(profile);
      }
    });
    
    // Create edges between profiles with similar titles
    let edgesCreated = 0;
    
    for (const jobFunction in profilesByFunction) {
      const profiles = profilesByFunction[jobFunction];
      
      if (profiles.length > 1) {
        // Get node IDs for all profiles
        const { data: nodeProfiles, error: nodeProfilesError } = await supabase
          .from('gnn_node_profiles')
          .select('node_id, profile_id')
          .in('profile_id', profiles.map(p => p.id));
        
        if (nodeProfilesError) {
          console.error('Error getting node profiles:', nodeProfilesError);
          continue;
        }
        
        // Create a map of profile ID to node ID
        const profileToNodeMap: Record<string, string> = {};
        nodeProfiles.forEach(np => {
          profileToNodeMap[np.profile_id] = np.node_id;
        });
        
        // Create edges between all pairs of profiles with similar titles
        for (let i = 0; i < profiles.length; i++) {
          for (let j = i + 1; j < profiles.length; j++) {
            const sourceNodeId = profileToNodeMap[profiles[i].id];
            const targetNodeId = profileToNodeMap[profiles[j].id];
            
            if (sourceNodeId && targetNodeId) {
              // Calculate title similarity (simple implementation)
              const titleA = profiles[i].title?.toLowerCase() || '';
              const titleB = profiles[j].title?.toLowerCase() || '';
              
              if (titleA && titleB) {
                // Simple similarity measure: common words / total unique words
                const wordsA = titleA.split(/\s+/);
                const wordsB = titleB.split(/\s+/);
                const commonWords = wordsA.filter(word => wordsB.includes(word)).length;
                const uniqueWords = new Set([...wordsA, ...wordsB]).size;
                const similarity = uniqueWords > 0 ? commonWords / uniqueWords : 0;
                
                if (similarity >= similarityThreshold) {
                  const edge = await createEdge(
                    sourceNodeId,
                    targetNodeId,
                    'title_similarity',
                    similarity,
                    { similarity }
                  );
                  
                  if (edge) {
                    edgesCreated++;
                  }
                }
              }
            }
          }
        }
      }
    }
    
    return edgesCreated;
  } catch (error) {
    console.error('Error in createTitleSimilarityEdges:', error);
    return 0;
  }
};

/**
 * Create mutual appearance edges between profiles that appear in multiple users' networks
 */
export const createMutualAppearanceEdges = async (): Promise<number> => {
  try {
    // Get all profiles that appear in multiple users' networks
    const { data, error } = await supabase.rpc('get_mutual_profiles');
    
    if (error) {
      console.error('Error getting mutual profiles:', error);
      return 0;
    }
    
    let edgesCreated = 0;
    
    // Create edges between profiles that appear in the same users' networks
    for (const mutualProfile of data || []) {
      const { profile_id, user_ids } = mutualProfile;
      
      // Get the node ID for this profile
      const { data: nodeProfile, error: nodeProfileError } = await supabase
        .from('gnn_node_profiles')
        .select('node_id')
        .eq('profile_id', profile_id)
        .single();
      
      if (nodeProfileError) {
        console.error('Error getting node profile:', nodeProfileError);
        continue;
      }
      
      // Get all other profiles that appear in the same users' networks
      const { data: otherProfiles, error: otherProfilesError } = await supabase.rpc(
        'get_profiles_in_same_networks',
        { user_ids_param: user_ids, profile_id_param: profile_id }
      );
      
      if (otherProfilesError) {
        console.error('Error getting other profiles:', otherProfilesError);
        continue;
      }
      
      // Create edges between this profile and all other profiles
      for (const otherProfile of otherProfiles || []) {
        const { data: otherNodeProfile, error: otherNodeProfileError } = await supabase
          .from('gnn_node_profiles')
          .select('node_id')
          .eq('profile_id', otherProfile.profile_id)
          .single();
        
        if (otherNodeProfileError) {
          console.error('Error getting other node profile:', otherNodeProfileError);
          continue;
        }
        
        // Calculate the weight based on the number of shared networks
        const weight = otherProfile.shared_networks / user_ids.length;
        
        const edge = await createEdge(
          nodeProfile.node_id,
          otherNodeProfile.node_id,
          'mutual',
          weight,
          { shared_networks: otherProfile.shared_networks }
        );
        
        if (edge) {
          edgesCreated++;
        }
      }
    }
    
    return edgesCreated;
  } catch (error) {
    console.error('Error in createMutualAppearanceEdges:', error);
    return 0;
  }
};

/**
 * Generate embeddings for a node
 */
export const generateNodeEmbedding = async (nodeId: string): Promise<number[] | null> => {
  try {
    // This is a placeholder for the actual embedding generation
    // In a real implementation, this would use a machine learning model
    
    // Get the node
    const { data: node, error: nodeError } = await supabase
      .from('gnn_nodes')
      .select('*')
      .eq('node_id', nodeId)
      .single();
    
    if (nodeError) {
      console.error('Error getting node:', nodeError);
      return null;
    }
    
    // If the node is a profile, get the profile data
    if (node.type === 'profile') {
      const { data: nodeProfile, error: nodeProfileError } = await supabase
        .from('gnn_node_profiles')
        .select('profile_id')
        .eq('node_id', nodeId)
        .single();
      
      if (nodeProfileError) {
        console.error('Error getting node profile:', nodeProfileError);
        return null;
      }
      
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', nodeProfile.profile_id)
        .single();
      
      if (profileError) {
        console.error('Error getting profile:', profileError);
        return null;
      }
      
      // Generate a simple embedding based on the profile data
      // In a real implementation, this would use a more sophisticated approach
      const embedding: number[] = [];
      
      // Add role level embedding
      if (profile.role_level === 'IC') {
        embedding.push(1, 0, 0);
      } else if (profile.role_level === 'Manager') {
        embedding.push(0, 1, 0);
      } else if (profile.role_level === 'Executive') {
        embedding.push(0, 0, 1);
      } else {
        embedding.push(0, 0, 0);
      }
      
      // Add job function embedding (simplified)
      const jobFunctions = [
        'Engineering', 'Sales', 'Marketing', 'Product', 'Design',
        'Data', 'HR', 'Finance', 'Other'
      ];
      
      jobFunctions.forEach(jf => {
        embedding.push(profile.job_function === jf ? 1 : 0);
      });
      
      // Add industry embedding (simplified)
      const industries = [
        'Technology', 'Finance', 'Healthcare', 'Education', 'Retail', 'Other'
      ];
      
      industries.forEach(ind => {
        embedding.push(profile.industry === ind ? 1 : 0);
      });
      
      // Add company size embedding
      if (profile.company_size === 'Large') {
        embedding.push(1, 0);
      } else if (profile.company_size === 'Small/Medium') {
        embedding.push(0, 1);
      } else {
        embedding.push(0, 0);
      }
      
      // Add skills embedding (simplified)
      const commonSkills = [
        'Programming', 'Software Development', 'Frontend Development',
        'Backend Development', 'Full Stack Development', 'Mobile Development',
        'DevOps', 'Sales', 'Marketing', 'Product Management', 'Design'
      ];
      
      commonSkills.forEach(skill => {
        embedding.push(profile.skills?.includes(skill) ? 1 : 0);
      });
      
      return embedding;
    }
    
    // For other node types, return a random embedding
    return Array.from({ length: 32 }, () => Math.random());
  } catch (error) {
    console.error('Error in generateNodeEmbedding:', error);
    return null;
  }
};

/**
 * Generate predictions for potential connections
 */
export const generatePredictions = async (userId: string): Promise<GnnPrediction[]> => {
  try {
    // This is a placeholder for the actual prediction generation
    // In a real implementation, this would use a machine learning model
    
    // Get all nodes for the user
    const { data: userNodes, error: userNodesError } = await supabase
      .from('gnn_nodes')
      .select('*')
      .contains('source_user_ids', [userId]);
    
    if (userNodesError) {
      console.error('Error getting user nodes:', userNodesError);
      return [];
    }
    
    // Get all existing connections for the user
    const { data: connections, error: connectionsError } = await supabase
      .from('connections')
      .select('profile_id')
      .eq('user_id', userId);
    
    if (connectionsError) {
      console.error('Error getting connections:', connectionsError);
      return [];
    }
    
    const connectedProfileIds = connections.map(c => c.profile_id);
    
    // Get all profiles that the user is not connected to
    const { data: unconnectedProfiles, error: unconnectedProfilesError } = await supabase
      .from('profiles')
      .select('*')
      .not('id', 'in', `(${connectedProfileIds.join(',')})`);
    
    if (unconnectedProfilesError) {
      console.error('Error getting unconnected profiles:', unconnectedProfilesError);
      return [];
    }
    
    // Generate predictions
    const predictions: GnnPrediction[] = [];
    
    // For each unconnected profile, calculate a score
    for (const profile of unconnectedProfiles || []) {
      // Get the node for this profile
      const { data: nodeProfile, error: nodeProfileError } = await supabase
        .from('gnn_node_profiles')
        .select('node_id')
        .eq('profile_id', profile.id)
        .single();
      
      if (nodeProfileError) {
        console.error('Error getting node profile:', nodeProfileError);
        continue;
      }
      
      // Calculate a score based on various factors
      let score = 0;
      
      // Factor 1: Number of mutual connections
      const { count: mutualCount, error: mutualCountError } = await supabase
        .from('gnn_edges')
        .select('*', { count: 'exact', head: true })
        .eq('edge_type', 'mutual')
        .or(`source_id.eq.${nodeProfile.node_id},target_id.eq.${nodeProfile.node_id}`);
      
      if (mutualCountError) {
        console.error('Error getting mutual count:', mutualCountError);
      } else {
        score += (mutualCount || 0) * 0.2; // Weight for mutual connections
      }
      
      // Factor 2: Number of affiliation connections
      const { count: affiliationCount, error: affiliationCountError } = await supabase
        .from('gnn_edges')
        .select('*', { count: 'exact', head: true })
        .eq('edge_type', 'affiliation')
        .or(`source_id.eq.${nodeProfile.node_id},target_id.eq.${nodeProfile.node_id}`);
      
      if (affiliationCountError) {
        console.error('Error getting affiliation count:', affiliationCountError);
      } else {
        score += (affiliationCount || 0) * 0.15; // Weight for affiliation connections
      }
      
      // Factor 3: Number of title similarity connections
      const { count: titleSimilarityCount, error: titleSimilarityCountError } = await supabase
        .from('gnn_edges')
        .select('*', { count: 'exact', head: true })
        .eq('edge_type', 'title_similarity')
        .or(`source_id.eq.${nodeProfile.node_id},target_id.eq.${nodeProfile.node_id}`);
      
      if (titleSimilarityCountError) {
        console.error('Error getting title similarity count:', titleSimilarityCountError);
      } else {
        score += (titleSimilarityCount || 0) * 0.1; // Weight for title similarity connections
      }
      
      // Normalize the score to be between 0 and 1
      score = Math.min(1, score);
      
      // Generate a reason for the prediction
      let reason = 'Based on ';
      const reasons: string[] = [];
      
      if (mutualCount && mutualCount > 0) {
        reasons.push(`${mutualCount} mutual connections`);
      }
      
      if (affiliationCount && affiliationCount > 0) {
        reasons.push(`${affiliationCount} shared affiliations`);
      }
      
      if (titleSimilarityCount && titleSimilarityCount > 0) {
        reasons.push(`${titleSimilarityCount} similar roles`);
      }
      
      if (reasons.length > 0) {
        reason += reasons.join(', ');
      } else {
        reason = 'Based on network analysis';
      }
      
      // Create a prediction
      const { data: prediction, error: predictionError } = await supabase
        .from('gnn_predictions')
        .insert({
          source_node_id: `user_${userId}`,
          target_node_id: nodeProfile.node_id,
          model_id: '00000000-0000-0000-0000-000000000000', // Placeholder
          score,
          reason,
        })
        .select()
        .single();
      
      if (predictionError) {
        console.error('Error creating prediction:', predictionError);
      } else {
        predictions.push(prediction);
      }
    }
    
    return predictions;
  } catch (error) {
    console.error('Error in generatePredictions:', error);
    return [];
  }
};

/**
 * Compare networks between two users
 */
export const compareNetworks = async (userAId: string, userBId: string): Promise<any> => {
  try {
    // Create a comparison session
    const { data: session, error: sessionError } = await supabase
      .from('comparison_sessions')
      .insert({
        user_a_id: userAId,
        user_b_id: userBId,
        status: 'pending',
      })
      .select()
      .single();
    
    if (sessionError) {
      console.error('Error creating comparison session:', sessionError);
      return null;
    }
    
    // Get all connections for user A
    const { data: connectionsA, error: connectionsAError } = await supabase
      .from('connections')
      .select(`
        profile_id,
        profiles:profile_id (*)
      `)
      .eq('user_id', userAId);
    
    if (connectionsAError) {
      console.error('Error getting connections for user A:', connectionsAError);
      return null;
    }
    
    // Get all connections for user B
    const { data: connectionsB, error: connectionsBError } = await supabase
      .from('connections')
      .select(`
        profile_id,
        profiles:profile_id (*)
      `)
      .eq('user_id', userBId);
    
    if (connectionsBError) {
      console.error('Error getting connections for user B:', connectionsBError);
      return null;
    }
    
    // Find mutual connections
    const profileIdsA = connectionsA.map((c: any) => c.profile_id);
    const profileIdsB = connectionsB.map((c: any) => c.profile_id);
    
    const mutualProfileIds = profileIdsA.filter(id => profileIdsB.includes(id));
    
    // Create comparison results for mutual connections
    for (const profileId of mutualProfileIds) {
      await supabase
        .from('comparison_results')
        .insert({
          session_id: session.id,
          result_type: 'mutual_connection',
          profile_a_id: profileId,
          profile_b_id: profileId,
          score: 1.0,
          details: { type: 'mutual_connection' },
        });
    }
    
    // Find predicted matches
    const profileMapA: Record<string, Profile> = {};
    connectionsA.forEach((c: any) => {
      profileMapA[c.profile_id] = c.profiles as Profile;
    });
    
    const profileMapB: Record<string, Profile> = {};
    connectionsB.forEach((c: any) => {
      profileMapB[c.profile_id] = c.profiles as Profile;
    });
    
    // For each profile in A, find similar profiles in B
    for (const profileIdA of profileIdsA) {
      if (mutualProfileIds.includes(profileIdA)) {
        continue; // Skip mutual connections
      }
      
      const profileA = profileMapA[profileIdA];
      
      for (const profileIdB of profileIdsB) {
        if (mutualProfileIds.includes(profileIdB)) {
          continue; // Skip mutual connections
        }
        
        const profileB = profileMapB[profileIdB];
        
        // Calculate similarity score
        let score = 0;
        
        // Factor 1: Same company
        if (profileA.company && profileB.company && profileA.company === profileB.company) {
          score += 0.3;
        }
        
        // Factor 2: Same job function
        if (profileA.job_function && profileB.job_function && profileA.job_function === profileB.job_function) {
          score += 0.2;
        }
        
        // Factor 3: Same industry
        if (profileA.industry && profileB.industry && profileA.industry === profileB.industry) {
          score += 0.2;
        }
        
        // Factor 4: Same role level
        if (profileA.role_level && profileB.role_level && profileA.role_level === profileB.role_level) {
          score += 0.1;
        }
        
        // Factor 5: Shared skills
        if (profileA.skills && profileB.skills) {
          const sharedSkills = profileA.skills.filter(skill => profileB.skills?.includes(skill));
          score += sharedSkills.length * 0.05;
        }
        
        // Only create a result if the score is above a threshold
        if (score >= 0.3) {
          await supabase
            .from('comparison_results')
            .insert({
              session_id: session.id,
              result_type: 'predicted_match',
              profile_a_id: profileIdA,
              profile_b_id: profileIdB,
              score,
              details: {
                type: 'predicted_match',
                factors: {
                  same_company: profileA.company === profileB.company,
                  same_job_function: profileA.job_function === profileB.job_function,
                  same_industry: profileA.industry === profileB.industry,
                  same_role_level: profileA.role_level === profileB.role_level,
                  shared_skills: profileA.skills?.filter(skill => profileB.skills?.includes(skill)),
                },
              },
            });
        }
      }
    }
    
    // Find overlapping tags
    const tagsA = new Set<string>();
    connectionsA.forEach((c: any) => {
      const profile = c.profiles as Profile;
      if (profile.tags) {
        profile.tags.forEach((tag: string) => tagsA.add(tag));
      }
    });
    
    const tagsB = new Set<string>();
    connectionsB.forEach((c: any) => {
      const profile = c.profiles as Profile;
      if (profile.tags) {
        profile.tags.forEach((tag: string) => tagsB.add(tag));
      }
    });
    
    const overlappingTags = [...tagsA].filter(tag => tagsB.has(tag));
    
    // Create comparison results for overlapping tags
    for (const tag of overlappingTags) {
      await supabase
        .from('comparison_results')
        .insert({
          session_id: session.id,
          result_type: 'overlapping_tag',
          score: 1.0,
          details: { type: 'overlapping_tag', tag },
        });
    }
    
    // Update the session status
    await supabase
      .from('comparison_sessions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', session.id);
    
    // Return the session ID
    return session.id;
  } catch (error) {
    console.error('Error in compareNetworks:', error);
    return null;
  }
};
