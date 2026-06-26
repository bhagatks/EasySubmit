INSERT INTO "app_config" ("key", "value", "updatedAt")
VALUES (
  'subscriptions',
  '{
    "enabled": false,
    "currency": "usd",
    "plans": {
      "weekly": {
        "price": 2.99,
        "dailyEnhancements": 25,
        "stripePriceId": ""
      },
      "monthly": {
        "price": 7.99,
        "dailyEnhancements": 25,
        "stripePriceId": ""
      },
      "yearly": {
        "price": 59.99,
        "dailyEnhancements": 25,
        "stripePriceId": ""
      }
    }
  }',
  CURRENT_TIMESTAMP
)
ON CONFLICT ("key") DO NOTHING;
