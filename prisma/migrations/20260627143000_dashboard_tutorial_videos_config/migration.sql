INSERT INTO "app_config" ("key", "value", "updatedAt")
VALUES (
  'dashboardTutorialVideos',
  '{"videos":[{"id":"tutorial-1","title":"Title1","watchUrl":"https://www.youtube.com/watch?v=IvjkGXZcnvc&t=4s"},{"id":"tutorial-2","title":"Title2","watchUrl":"https://www.youtube.com/watch?v=IvjkGXZcnvc&t=4s"},{"id":"tutorial-3","title":"Title3","watchUrl":"https://www.youtube.com/watch?v=IvjkGXZcnvc&t=4s"},{"id":"tutorial-4","title":"Title4","watchUrl":"https://www.youtube.com/watch?v=IvjkGXZcnvc&t=4s"},{"id":"tutorial-5","title":"Title5","watchUrl":"https://www.youtube.com/watch?v=IvjkGXZcnvc&t=4s"},{"id":"tutorial-6","title":"Title6","watchUrl":"https://www.youtube.com/watch?v=IvjkGXZcnvc&t=4s"}]}'::jsonb,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("key") DO NOTHING;
