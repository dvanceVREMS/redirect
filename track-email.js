// functions/track-email.js
const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  // Get tracking parameters
  const params = event.queryStringParameters;
  const ticketId = params.ticket_id;
  const eventType = params.event || 'open';
  const metadata = {
    client: params.client || 'unknown',
    timestamp: new Date().toISOString(),
    user_agent: event.headers['user-agent'] || 'unknown',
    ip: event.headers['x-forwarded-for'] || event.headers['client-ip'] || 'unknown'
  };
  
  // Generate a transparent GIF
  const transparentGif = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  
  // Validate required parameters
  if (!ticketId) {
    console.log('Missing ticket_id parameter');
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-store, no-cache, must-revalidate'
      },
      body: transparentGif,
      isBase64Encoded: true
    };
  }
  
  try {
    console.log(`Processing email tracking for ticket ${ticketId}`);
    
    // Call our webhook function directly
    const webhookPayload = {
      ticket_id: ticketId,
      event_type: eventType,
      metadata: metadata
    };
    
    // Send the tracking event to our webhook - don't wait for completion
    const webhookUrl = `https://${event.headers.host}/.netlify/functions/email-webhook`;
    
    // Fire and forget - we don't want to delay returning the tracking pixel
    fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhookPayload)
    }).catch(error => {
      console.error('Error sending webhook:', error);
    });
    
    // Return a 1x1 transparent GIF immediately
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Expires': '0',
        'Pragma': 'no-cache'
      },
      body: transparentGif,
      isBase64Encoded: true
    };
  } catch (error) {
    console.error('Error processing tracking:', error);
    
    // Still return a tracking pixel even if there's an error
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-store, no-cache, must-revalidate'
      },
      body: transparentGif,
      isBase64Encoded: true
    };
  }
};