/**
 * Development-only routes for SMS simulator communication
 */

import { Router } from 'express';
import { logger } from '@logger';

const router = Router();

// In-memory storage for simulator messages (development only)
const simulatorMessages: Map<string, Array<{
  id: string;
  body: string;
  from: string;
  timestamp: Date;
  read: boolean;
}>> = new Map();

const simulatorClients: Map<string, {
  phoneNumber: string;
  lastPoll: Date;
  connected: boolean;
}> = new Map();

/**
 * Register simulator client
 */
router.post('/register', (req, res) => {
  if (process.env.NODE_ENV !== 'local' && process.env.NODE_ENV !== 'development') {
    return res.status(404).json({ error: 'Not found' });
  }

  const { phoneNumber } = req.body;
  if (!phoneNumber) {
    return res.status(400).json({ error: 'Phone number required' });
  }

  const clientId = `simulator_${phoneNumber.replace(/\+/g, '')}`;
  
  simulatorClients.set(clientId, {
    phoneNumber,
    lastPoll: new Date(),
    connected: true
  });

  // Initialize empty message queue
  if (!simulatorMessages.has(phoneNumber)) {
    simulatorMessages.set(phoneNumber, []);
  }

  logger.info('[SimulatorAPI] Simulator client registered', { phoneNumber, clientId });
  
  res.json({ 
    success: true, 
    clientId,
    message: 'Simulator registered successfully'
  });
});

/**
 * Poll for new messages
 */
router.get('/messages/:phoneNumber', (req, res) => {
  if (process.env.NODE_ENV !== 'local' && process.env.NODE_ENV !== 'development') {
    return res.status(404).json({ error: 'Not found' });
  }

  const { phoneNumber } = req.params;
  const messages = simulatorMessages.get(phoneNumber) || [];
  
  // Mark all messages as read
  messages.forEach(msg => msg.read = true);
  
  // Update last poll time
  const clientId = `simulator_${phoneNumber.replace(/\+/g, '')}`;
  const client = simulatorClients.get(clientId);
  if (client) {
    client.lastPoll = new Date();
  }

  res.json({ messages });
});

/**
 * Send a reply from the simulator
 */
router.post('/reply', async (req, res) => {
  if (process.env.NODE_ENV !== 'local' && process.env.NODE_ENV !== 'development') {
    return res.status(404).json({ error: 'Not found' });
  }

  const { phoneNumber, message } = req.body;
  
  if (!phoneNumber || !message) {
    return res.status(400).json({ error: 'Phone number and message required' });
  }

  try {
    logger.info('[SimulatorAPI] Simulator reply received', { 
      phoneNumber, 
      messageLength: message.length 
    });

    // Forward to the AWS webhook handler
    const webhookPayload = {
      messageBody: message,
      originationNumber: phoneNumber,
      destinationNumber: process.env.AWS_PHONE_NUMBER || '+12065559457',
      messageId: `sim_${Date.now()}`,
      messageType: 'TEXT',
      inboundMessageId: `sim_inbound_${Date.now()}`,
      previousPublishedMessageId: null
    };

    // Import and call the SMS webhook handler
    const { SMSWebhookController } = await import('../../controllers/smsWebhookController.js');
    const controller = new SMSWebhookController();
    
    // Create a mock request/response to call the handler
    const mockReq = {
      body: {
        Type: "Notification",
        MessageId: `sim-${Date.now()}`,
        TopicArn: process.env.AWS_SNS_TOPIC_ARN || 'arn:aws:sns:us-west-1:simulator:topic',
        Message: JSON.stringify(webhookPayload),
        Timestamp: new Date().toISOString(),
        SignatureVersion: "1",
        Signature: "SIMULATED",
        SigningCertURL: "SIMULATED",
        UnsubscribeURL: "SIMULATED"
      },
      headers: {
        'x-simulator': 'true',
        'x-amz-sns-message-type': 'Notification'
      }
    } as any;
    
    const mockRes = {
      status: () => ({ json: () => {} }),
      json: () => {}
    } as any;
    
    await controller.handleIncomingSMS(mockReq, mockRes);
    
    res.json({ 
      success: true,
      message: 'Reply processed successfully'
    });

  } catch (error: any) {
    logger.error('[SimulatorAPI] Failed to process simulator reply', {
      phoneNumber,
      error: error.message
    });
    
    res.status(500).json({ 
      success: false,
      error: 'Failed to process reply'
    });
  }
});

/**
 * Add incoming message to simulator queue (called by AWS SMS service)
 */
export function addSimulatorMessage(phoneNumber: string, body: string, from: string): void {
  if (process.env.NODE_ENV !== 'local' && process.env.NODE_ENV !== 'development') {
    return;
  }

  const messages = simulatorMessages.get(phoneNumber) || [];
  
  messages.push({
    id: `msg_${Date.now()}`,
    body,
    from,
    timestamp: new Date(),
    read: false
  });

  simulatorMessages.set(phoneNumber, messages);
  
  logger.info('[SimulatorAPI] Message added to simulator queue', { 
    phoneNumber, 
    from,
    bodyLength: body.length,
    queueSize: messages.length
  });
}

/**
 * Get active simulator status
 */
router.get('/status', (req, res) => {
  if (process.env.NODE_ENV !== 'local' && process.env.NODE_ENV !== 'development') {
    return res.status(404).json({ error: 'Not found' });
  }

  const activeClients = Array.from(simulatorClients.entries()).map(([id, client]) => ({
    id,
    phoneNumber: client.phoneNumber,
    lastPoll: client.lastPoll,
    connected: client.connected,
    messageCount: simulatorMessages.get(client.phoneNumber)?.length || 0
  }));

  res.json({ 
    activeClients,
    totalMessages: Array.from(simulatorMessages.values()).flat().length
  });
});

export default router;