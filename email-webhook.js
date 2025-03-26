// functions/email-webhook.js
const fetch = require('node-fetch');
const crypto = require('crypto');
require('dotenv').config();

exports.handler = async function(event, context) {
  // Verify Zendesk webhook signature
  const webhookSecret = process.env.ZENDESK_WEBHOOK_SECRET;
  const signature = event.headers['x-zendesk-webhook-signature'];
  
  if (webhookSecret && signature) {
    const hmac = crypto.createHmac('sha256', webhookSecret);
    const calculatedSignature = hmac.update(event.body).digest('hex');
    
    if (calculatedSignature !== signature) {
      console.error('Invalid webhook signature');
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'Invalid signature' })
      };
    }
  }

  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    // Parse the webhook payload
    const payload = JSON.parse(event.body);
    
    // Extract tracking information
    const ticketId = payload.ticket_id;
    const eventType = payload.event_type || 'webhook_event';
    const timestamp = payload.timestamp || new Date().toISOString();
    
    // Basic validation
    if (!ticketId) {
      return { 
        statusCode: 400, 
        body: JSON.stringify({ error: "Missing ticket_id" }) 
      };
    }
    
    // Log the event 
    console.log(`Processing Zendesk webhook: ${eventType} for ticket ${ticketId}`);
    
    // Call Zendesk API to update the ticket
    const result = await updateZendeskTicket(ticketId, eventType, timestamp, payload);
    
    // Return success
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        message: "Webhook processed",
        ticket_id: ticketId
      })
    };
  } catch (error) {
    console.error("Webhook processing error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: "Internal server error", 
        message: error.message 
      })
    };
  }
};

// Function to update a Zendesk ticket
async function updateZendeskTicket(ticketId, eventType, timestamp, payload) {
  const zendeskDomain = process.env.ZENDESK_DOMAIN || "nevadasecretaryofstate.zendesk.com";
  const apiToken = process.env.ZENDESK_API_TOKEN;
  
  if (!apiToken) {
    throw new Error("Missing Zendesk API token in environment variables");
  }
  
  // Prepare the comment text
  let commentText = `Zendesk webhook received\nEvent Type: ${eventType}\nTime: ${timestamp}\n`;
  
  // Add relevant payload information
  if (payload.recipient) {
    commentText += `Recipient: ${payload.recipient}\n`;
  }
  if (payload.agent_id) {
    commentText += `Agent ID: ${payload.agent_id}\n`;
  }
  
  // Prepare the request payload
  const requestPayload = {
    ticket: {
      comment: {
        body: commentText,
        public: false
      },
      tags: [`email_tracking_${eventType}`]
    }
  };
  
  console.log(`Updating ticket ${ticketId} via Zendesk API`);
  
  // Make the API request
  const response = await fetch(
    `https://${zendeskDomain}/api/v2/tickets/${ticketId}.json`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${apiToken}`
      },
      body: JSON.stringify(requestPayload)
    }
  );
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Zendesk API error: ${response.status} ${errorText}`);
  }
  
  return await response.json();
}