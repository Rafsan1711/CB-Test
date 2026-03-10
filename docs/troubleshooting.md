# Troubleshooting

Encountering issues? Here are solutions to common problems.

## HuggingFace Space Not Responding
**Symptoms**: The frontend shows "Network Error" or the API returns 503.
**Solution**: 
1. HuggingFace free Spaces go to sleep after inactivity. Visit your Space URL directly to wake it up.
2. Check the Space logs for any startup errors (e.g., missing environment variables).

## GitHub Webhook Not Firing
**Symptoms**: You open an issue, but ContriBot doesn't react.
**Solution**:
1. Go to your GitHub Repository > Settings > Webhooks.
2. Check the Recent Deliveries tab for the ContriBot webhook.
3. If deliveries are failing, ensure your backend URL is correct and accessible from the internet.
4. Verify that the webhook secret matches the one in your database.

## Gemini API Rate Limits
**Symptoms**: Backend logs show `429 Too Many Requests` from the Gemini API.
**Solution**:
1. The free tier of Gemini has strict rate limits.
2. ContriBot implements exponential backoff, but if you process too many issues simultaneously, it may fail.
3. Consider upgrading to a paid Google Cloud tier if you have high volume.

## Authentication Issues
**Symptoms**: Cannot log in to the frontend.
**Solution**:
1. Ensure your Firebase project is correctly configured with the authorized domains (including your Vercel/localhost URLs).
2. Verify that the `FIREBASE_SERVICE_ACCOUNT` JSON string in your backend is valid and not truncated.

## How to Check Task Logs
If ContriBot fails while writing code or verifying a PR, you can check the detailed logs:
1. Open the ContriBot UI.
2. Navigate to the **Tasks** or **Activity** tab.
3. Click on the failed task to view the raw logs and error messages.
