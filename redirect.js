// functions/redirect.js
exports.handler = async function(event, context) {
  // Get parameters
  const params = event.queryStringParameters;
  const ticketId = params.ticket_id;
  const url = params.url;
  const isTicketView = url && url.includes('/hc/requests/');
  
  // HTML for the redirect page
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Redirecting - VREMS Help Desk</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      text-align: center;
      padding: 40px 20px;
      max-width: 600px;
      margin: 0 auto;
      color: #2F3941;
      background: #f5f7f9;
    }
    .logo {
      max-width: 200px;
      margin-bottom: 20px;
    }
    .container {
      background: white;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }
    .loader {
      border: 4px solid #f3f3f3;
      border-top: 4px solid #003366; /* Nevada blue */
      border-radius: 50%;
      width: 30px;
      height: 30px;
      animation: spin 1s linear infinite;
      margin: 20px auto;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .destination {
      color: #68737d;
      font-size: 14px;
      word-break: break-all;
      margin-top: 20px;
      padding: 10px;
      background: #f8f9fa;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <div class="container">
    <img src="https://nevadatreasurer.gov/uploadedImages/nevadatreasurerorgHome/content/Home/SOS_Logo_Horizontal_blue1c%20copy.png" alt="Nevada Secretary of State" class="logo">
    <h1>VREMS Help Desk</h1>
    <div class="loader"></div>
    <p>${isTicketView ? 'You\'re being redirected to your support request.' : 'You\'re being redirected to your destination.'}</p>
    <div class="destination">
      ${url ? url : 'Nevada Secretary of State Support'}
    </div>
  </div>
  
  <script>
    // Record the click and redirect
    function processRedirect() {
      // Redirect after a short delay
      setTimeout(function() {
        window.location.href = "${url || 'https://nevadasecretaryofstate.zendesk.com'}";
      }, 2000);
    }
    
    // Start the process when page loads
    window.onload = processRedirect;
  </script>
</body>
</html>
  `;
  
  // Record the click via webhook
  if (ticketId) {
    try {
      // Prepare webhook payload
      const webhookPayload = {
        ticket_id: ticketId,
        event_type: isTicketView ? 'ticket_view' : 'click',
        timestamp: new Date().toISOString(),
        metadata: {
          url: url || 'unknown',
          timestamp: new Date().toISOString(),
          user_agent: event.headers['user-agent'] || 'unknown',
          ip: event.headers['client-ip'] || event.headers['x-forwarded-for'] || 'unknown'
        }
      };
      
      // Send to webhook
      const webhookUrl = 'https://67e440d8c91e55245ca82784--admirable-sunburst-485efe.netlify.app/.netlify/functions/email-webhook';
      
      fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload)
      }).catch(error => {
        console.error('Error sending webhook:', error);
      });
    } catch (error) {
      console.error('Error processing redirect:', error);
    }
  }
  
  // Return the HTML page
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/html',
      'Cache-Control': 'no-store, no-cache, must-revalidate'
    },
    body: html
  };
};