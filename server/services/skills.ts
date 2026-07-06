import Mustache from 'mustache';
import { HttpError } from '../http';
import { requireSupabase } from '../supabase';

const ALLOWED_VARIABLES = new Set(['ageBand', 'subject', 'customIdea', 'sceneDensity', 'difficulty', 'lineWeight']);

export function validateTemplate(template: string) {
  const tags = Mustache.parse(template)
    .filter((token) => ['name', '&'].includes(String(token[0])))
    .map((token) => String(token[1]));
  const unknown = tags.filter((tag) => !ALLOWED_VARIABLES.has(tag));
  if (unknown.length) throw new HttpError(400, 'UNKNOWN_SKILL_VARIABLE', `İzin verilmeyen değişken: ${unknown.join(', ')}`);
}

export async function compileGenerationPrompt(input: Record<string, string>) {
  const supabase = requireSupabase();
  const { data: skills, error } = await supabase
    .from('ai_skills')
    .select('id, slug, active_version_id, ai_skill_versions!ai_skills_active_version_fk(id, version, system_template, negative_template, quality_rules)')
    .not('active_version_id', 'is', null);
  if (error || !skills?.length) throw new HttpError(503, 'SKILL_NOT_PUBLISHED', 'Aktif üretim skill’i bulunamadı.');
  const order = ['coloring-page-generator', 'age-adapter', 'scene-composer', 'prompt-safety-guard', 'line-art-cleaner', 'colorability-evaluator', 'content-metadata-generator'];
  const snapshots = skills.map((skill) => {
    const version = Array.isArray(skill.ai_skill_versions) ? skill.ai_skill_versions[0] : skill.ai_skill_versions;
    if (!version) throw new HttpError(503, 'SKILL_NOT_PUBLISHED', `${skill.slug} için aktif sürüm bulunamadı.`);
    validateTemplate(`${version.system_template}\n${version.negative_template}`);
    return { skillId: skill.id, slug: skill.slug, versionId: version.id, version: version.version, qualityRules: version.quality_rules, text: `${Mustache.render(version.system_template, input)}${version.negative_template ? `\nAvoid: ${Mustache.render(version.negative_template, input)}` : ''}` };
  }).sort((first, second) => order.indexOf(first.slug) - order.indexOf(second.slug));
  const qualityRules = snapshots.find((item) => item.slug === 'colorability-evaluator')?.qualityRules || snapshots[0].qualityRules;
  return {
    prompt: snapshots.map((item) => item.text).join('\n\n'),
    snapshot: { skills: snapshots.map(({ text: _text, ...item }) => item), qualityRules },
  };
}
