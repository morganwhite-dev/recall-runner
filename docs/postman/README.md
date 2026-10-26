# Postman collection for judges

`recall-runner.postman_collection.json` has five requests. Four ask the PayPal sandbox about money the app moved. One checks that the app refuses a fake PayPal message. Together they show the money movement is real PayPal sandbox activity and that the app does not trust unsigned messages.

## Set up (2 minutes)

1. In Postman, choose Import and pick the JSON file.
2. Open the collection, then the Variables tab. The file holds no real values. Fill in the Current value column:

| Variable | What to put there |
| --- | --- |
| `client_id` | The sandbox app's client id (from the organizers or the PayPal developer dashboard) |
| `client_secret` | The same app's secret |
| `base_url` | Already set to `https://recall-runner.onrender.com` |
| `order_id` | A PayPal order id (see below) |
| `refund_id` | A PayPal refund id (see below) |
| `payout_batch_id` | A PayPal payout batch id (see below) |
| `access_token` | Leave empty. Request 1 fills it in |

3. Run the requests in order, 1 to 5. Each has a Tests tab that checks the result, so the Test Results tab shows pass or fail.

## Where to find the ids

Run the demo first (Start fresh demo, approve the campaign, settle a buyer). Then:

- **Refund id and payout batch id:** the store dashboard's "Why this happened" timeline for a settled case (the PayPal step ends with "PayPal id …"), and the buyer's receipt (the Reference line). A refund id goes in `refund_id`; a payout batch id goes in `payout_batch_id`. A case settles by one or the other, so you will find one of them per case; settle one buyer paid within 180 days and one paid after it to get both.
- **Order id:** the buyer's receipt shows it on the "Order" line. It is the PayPal order the buyer paid for in the sandbox.

## What each request proves

1. **Get an access token.** Signs in to the PayPal sandbox API with the app's own credentials. Expect 200. It proves the credentials are a working sandbox app. The test script saves the token for requests 2 to 4.
2. **Get the order.** Asks PayPal for the order a buyer paid for. Expect 200. It proves the purchase exists in PayPal, not just in our database.
3. **Get the refund.** Asks PayPal for a refund the app sent. Expect 200. It proves PayPal itself recorded the refund.
4. **Get the payout batch.** Asks PayPal for a PayPal Payouts batch. Expect 200. It proves orders older than PayPal's 180-day refund window were paid out through PayPal Payouts.
5. **Send an unsigned fake webhook.** Posts a made-up event to the app with no PayPal signature headers. Expect 400 with `{"error":"signature not verified"}`. It proves the app checks every event's signature with PayPal before trusting it, so nobody can fake "the refund finished" and settle a case. Unlike requests 1 to 4, this one needs no PayPal credentials.

Note: request 5 does leave one row in the app's webhook log, marked as not verified. It cannot settle anything.

## Good to know

- Requests 2 to 4 return 404 if the id does not belong to the app you got a token for, so use the sandbox credentials the demo runs on.
- The access token expires after a few hours. Run request 1 again if requests 2 to 4 return 401.
- Request 5 hits the live demo site. If the site was asleep it can take 30 seconds or more to answer the first time.
