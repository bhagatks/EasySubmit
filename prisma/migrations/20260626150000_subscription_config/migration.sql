INSERT INTO "app_config" ("key", "value", "description", "updatedAt")
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
  'Subscription plan pricing and daily enhancement limits. Set enabled=true and stripePriceId values to go live.',
  CURRENT_TIMESTAMP
)
ON CONFLICT ("key") DO NOTHING;
