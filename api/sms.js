const twilio = require('twilio');

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

const client = twilio(accountSid, authToken);

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { to, message, type = 'standard' } = req.body;

    // Validate inputs
    if (!to || !message) {
        return res.status(400).json({ 
            error: 'Missing required fields',
            details: 'Both "to" and "message" are required' 
        });
    }

    // Format phone number (ensure it has country code)
    let formattedNumber = to.replace(/\D/g, '');
    if (!formattedNumber.startsWith('1') && formattedNumber.length === 10) {
        formattedNumber = '1' + formattedNumber; // Add US country code
    }
    formattedNumber = '+' + formattedNumber;

    try {
        // Add message prefix based on type
        let fullMessage = message;
        switch(type) {
            case 'urgent':
                fullMessage = `🚨 URGENT: ${message}`;
                break;
            case 'reminder':
                fullMessage = `⏰ REMINDER: ${message}`;
                break;
            case 'notification':
                fullMessage = `📢 Hey Spruce: ${message}`;
                break;
            default:
                fullMessage = `Hey Spruce: ${message}`;
        }

        // Send SMS via Twilio
        const messageInstance = await client.messages.create({
            body: fullMessage,
            from: twilioPhoneNumber,
            to: formattedNumber
        });

        // Log for tracking
        console.log(`SMS sent successfully: ${messageInstance.sid}`);

        return res.status(200).json({
            success: true,
            messageId: messageInstance.sid,
            to: formattedNumber,
            status: messageInstance.status,
            dateCreated: messageInstance.dateCreated
        });

    } catch (error) {
        console.error('Twilio SMS Error:', error);
        
        // Handle specific Twilio errors
        if (error.code === 21211) {
            return res.status(400).json({
                error: 'Invalid phone number',
                details: 'The phone number provided is not valid'
            });
        } else if (error.code === 21608) {
            return res.status(400).json({
                error: 'Unverified number',
                details: 'Cannot send to unverified number in trial mode'
            });
        }

        return res.status(500).json({
            error: 'Failed to send SMS',
            details: error.message
        });
    }
};

// Webhook endpoint for receiving SMS replies
module.exports.webhook = async (req, res) => {
    const { Body, From, MessageSid } = req.body;
    
    console.log('Received SMS:', {
        from: From,
        message: Body,
        messageId: MessageSid
    });

    // Here you would typically:
    // 1. Look up the user by phone number
    // 2. Find the related conversation
    // 3. Store the message in your database
    // 4. Send notifications to the web app
    
    // Send TwiML response (empty response acknowledges receipt)
    res.type('text/xml');
    res.send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
};

// Bulk SMS endpoint
module.exports.bulk = async (req, res) => {
    const { recipients, message, type = 'notification' } = req.body;
    
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
        return res.status(400).json({
            error: 'Invalid recipients',
            details: 'Recipients must be a non-empty array'
        });
    }

    const results = {
        successful: [],
        failed: []
    };

    // Send to each recipient
    for (const recipient of recipients) {
        try {
            let formattedNumber = recipient.phone.replace(/\D/g, '');
            if (!formattedNumber.startsWith('1') && formattedNumber.length === 10) {
                formattedNumber = '1' + formattedNumber;
            }
            formattedNumber = '+' + formattedNumber;

            const messageInstance = await client.messages.create({
                body: `Hey Spruce: ${message}`,
                from: twilioPhoneNumber,
                to: formattedNumber
            });

            results.successful.push({
                name: recipient.name,
                phone: recipient.phone,
                messageId: messageInstance.sid
            });
        } catch (error) {
            results.failed.push({
                name: recipient.name,
                phone: recipient.phone,
                error: error.message
            });
        }
    }

    return res.status(200).json({
        success: true,
        summary: {
            total: recipients.length,
            successful: results.successful.length,
            failed: results.failed.length
        },
        results
    });
};