// functions/track-click.js
const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  // Get parameters
  const params = event.queryStringParameters;
  const ticketId = params.ticket_id;
  const url = params.url;
  const defaultUrl = 'https://nevadasecretaryofstate.zendesk.com';
  
  // Basic validation
  if (!url) {
    console.log('Missing url parameter, redirecting to default');
    return {
      statusCode: 302,
      headers: {
        'Location': defaultUrl,
        'Cache-Control': 'no-store, no-cache, must-revalidate'
      },
      body: ''
    };
  }
  
  // Record the click via webhook if we have a ticket ID
  if (ticketId) {
    try {
      console.log(`Processing click tracking for ticket ${ticketId}, url: ${url}`);
      
      // Prepare webhook payload
      const webhookPayload = {
        ticket_id: ticketId,
        event_type: 'click',
        metadata: {
          url: url,
          timestamp: new Date().toISOString(),
          user_agent: event.headers['user-agent'] || 'unknown',
          ip: event.headers['x-forwarded-for'] || event.headers['client-ip'] || 'unknown'
        }
      };
      
      // Send to webhook - don't wait for response
      const webhookUrl = `https://${event.headers.host}/.netlify/functions/email-webhook`;
      
      // Fire and forget
      fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload)
      }).catch(error => {
        console.error('Error sending click webhook:', error);
      });
    } catch (error) {
      console.error('Error processing click tracking:', error);
    }
  } else {
    console.log('No ticket_id provided for click tracking');
  }
  
  // Always redirect, even if tracking fails
  return {
    statusCode: 302,
    headers: {
      'Location': url,
      'Cache-Control': 'no-store, no-cache, must-revalidate'
    },
    body: ''
  };
};