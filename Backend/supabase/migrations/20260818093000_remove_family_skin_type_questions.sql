delete from public.skin_type_responses
where question_id in (
  select q.id
  from public.skin_type_questions q
  join public.skin_type_questionnaires qq on qq.id = q.questionnaire_id
  where qq.version = 'baumann_ko_rewrite_v1'
    and q.question_key in ('WT_45', 'WT_46', 'WT_47', 'WT_48')
);

delete from public.skin_type_options
where question_id in (
  select q.id
  from public.skin_type_questions q
  join public.skin_type_questionnaires qq on qq.id = q.questionnaire_id
  where qq.version = 'baumann_ko_rewrite_v1'
    and q.question_key in ('WT_45', 'WT_46', 'WT_47', 'WT_48')
);

delete from public.skin_type_questions
where id in (
  select q.id
  from public.skin_type_questions q
  join public.skin_type_questionnaires qq on qq.id = q.questionnaire_id
  where qq.version = 'baumann_ko_rewrite_v1'
    and q.question_key in ('WT_45', 'WT_46', 'WT_47', 'WT_48')
);
