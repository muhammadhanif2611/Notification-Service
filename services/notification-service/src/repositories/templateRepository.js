import { supabase } from '@notification-gateway/database';

export async function findTemplate(code, channel, projectId) {
  const { data, error } = await supabase
    .from('templates')
    .select('body, subject')
    .eq('code', code)
    .eq('channel', channel)
    .eq('project_id', projectId)
    .maybeSingle();
  if (error) throw error;
  return data;
}
