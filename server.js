
/**
 * Enter your Sendbird information
 */
var APP_ID = 'AD791A35-62CA-4E37-A490-79C7368C5D77';
var USER_ID = 'PFD';
const TOKEN = 'eb55f1c4e4118a422644b97f0e62ba1f39014649';
const ENTRYPOINT = 'https://api-AD791A35-62CA-4E37-A490-79C7368C5D77.sendbird.com/v3/bots';


/**
 * DIALOGFLOW CONFIGURATION
 * 
 * To use this app you must login first with google:
 * gcloud auth application-default login. 
 * 
 * INSTALL gcloud FROM HERE:
 * https://cloud.google.com/sdk/docs/install
*/
var DIALOGFLOW_PROJECT_ID = 'ocbc-personal-banker-n9li';
var GOOGLE_SESSION_ID = 'd-FL95Q19q7MQmFpd7hHD0Ty';
var DIALOGFLOW_LANG = 'en-US';

/**
 * Sendbird global object
 */
var sb;

/**
 * Include EXPRESS framework 
 * and body parser
 */
const express = require('express');
const app = express();
const bodyParser = require("body-parser");

/**
 * Use AXIOS for sending and receiving HTTP requests
 */
const axios = require('axios');

/**
 * Install Sendbird
 */
const SendBird = require('sendbird');

/**
 * Install DialogFlow API
 */
const dialogflow = require('@google-cloud/dialogflow').v2beta1;

/**
 * Enable Middleware
 */
app.use(express.json()); 
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));


/**
 * Show welcome screen
 */
app.get('/', async (req, res) => {
    res.send(`Welcome to Sendbird `);
});

/**
 * Get bot list
 */
app.get('/bots', async (req, res) => {
    init( async (connected) => {
        if (connected) {
            const bots = await getBotList();
            res.status(200).json(bots);
        } else {
            const bots = await getBotList();
            res.status(200).json(bots);
            res.send('Unable to connect to Sendbird.');
        }
    })
});

/**
 * Create bot
 * ============
 * Send a POST request to create a new Bot. These are 
 * some values you can send for creating bot named: bot1
 * {
 *   "bot_userid": "bot1",
 *   "bot_nickname": "bot1",
 *   "bot_profile_url": "https://via.placeholder.com/50x50",
 *   "bot_type": "DialogFlow",
 *   "bot_callback_url": "https://730eb8b5bc29.ngrok.io/callback",
 *   "is_privacy_mode": false
 * }
 */
app.post('/bots', async (req, res) => {
    const body = req.body;
    if (!body.is_privacy_mode) {
        body.is_privacy_mode = false
    }
    init(async (connected) => {
        if (connected) {
            const response = await createBot(body);
            res.status(200).json(response);
        } else {
            res.send('Unable to connect to Sendbird.');
        }
    })
});

/**
 * Update bot
 * ============
 * Send a PUT request to update an existing Bot.
 * {
 *   "bot_userid": "bot1",
 *   "bot_nickname": "bot1",
 *   "bot_profile_url": "https://via.placeholder.com/50x50",
 *   "bot_type": "DialogFlow",
 *   "bot_callback_url": "http://localhost:5500",
 *   "is_privacy_mode": false
 * }
 */
app.put('/bots/:id', async (req, res) => {
    const body = req.body;
    init(async (connected) => {
        if (connected) {
            const response = await updateBot(req.params.id, body);
            res.status(200).json(response);
        } else {
            res.send(`Unable to connect to Sendbird. ${connected}`);
        }
    })
});

/**
 * Add bot to channel
 * ===================
 * Once you create a bot you can add it to one of your channels.
 * Send a GET request to do that.
 */
app.get('/bots/:channel_url/:bot_id', async (req, res) => {    
    const botId = req.params.bot_id;
    const channelUrl = req.params.channel_url;
    //a = req.params.channel_url;
    addBotToChannel(botId, channelUrl);
    res.status(200).json({
        message: 'Bot ' + botId + ' added to channel ' + channelUrl
    });
});

/**
 * Sendbird's Platform API runs this POST request when 
 * a user sends a message. We receive that message and
 * send to DIALOGFLOW.
 */
//
app.post('/callback', express.json(), async (req, res) => {
    const { message, bot, channel } = req.body;
    // let obj = JSON.parse(req.body);
    console.log("message", message + " bot " + bot + " channel " + channel)
    console.log('Request ody', req.body);
    // console.log('1', req.body.bot.bot_userid);

    if (message && bot && channel) {
        /**
         * Get bot id and channel url
         */
        const botId = bot.bot_userid;
        const channelUrl = channel.channel_url;
        /**
         * Get input text and send to dialogflow
         */
        const msgText = message.text;
        console.log('Sending to DialogFlow...');
        /**
         * Send user message from Sendbird to dialogflow
         */
        sendToDialogFlow(msgText, async (response) => {
            console.log('Response from DF: ' + response);
            /**
             * Lastly, send Dialogflow response to chat using our Bot
             */
            await fromDialogFlowSendMessageToChannel(response, channelUrl, botId);
            /**
             * Respond HTTP OK (200)
             */
            res.status(200).json({
                message: 'Response from DialogFlow: ' + response
            });        
        });
    } else {
        
        res.status(200).json({
            
            message: 'Wrong format'
           
        });
    }
});

app.listen(5500, () => console.log(`Sendbid DialogFlow BOT listening on port http://localhost:${5500}`));

/**
 * HELPER FUNCTIONS
 */
// var passwords = "c9dc3fb9c054132b501fd85c757416ba01620f60";
// function init(callback) {
//     sb = new SendBird({appId: APP_ID, localCacheEnabled: true});
//     sb.connect(USER_ID, passwords, function(user, error) {
//         if (error) {
//             console.log(`Error connecting to sendbird // ${user} and ${error}`); 
//             callback(false);
//         } else {
//             console.log('You are connected now');
//             callback(true);
//         }
//     });
// }

// Create the channel
sb = new SendBird({appId: APP_ID});
sb.connect(USER_ID, function(user, error) {
    async function creategroupchannel()
    {
    const params = new sb.GroupChannelParams();
    //params.isPublic = true; // or true, depending on the type of group channel you want to create
    params.isDistinct = false;
    params.name = "Test Channel";
    params.operatorUserIds = ['840724'];

    try {
        const channel = await sb.GroupChannel.createChannel(params);
        console.log('Group Channel Created:', channel);
    } catch (error) {
        console.error('Error creating group channel:', error);
    }
}
creategroupchannel()
})

// For user to send message without logging in
    // OpenChannel_Url ="bot-channel-url";
    // sb = new SendBird({appId: APP_ID});
    // sb.connect(USER_ID, function(user, error) {
    //     if (error) {
    //         console.log(`Error connecting to sendbird // ${user} and ${error}`); 
    //     }
    //     // Enter the channel
    //     sb.GroupChannel.getChannel(OpenChannel_Url, function(openChannel, error) {
    //     if (error) {

    //         console.log(`error: ${error}`)
    //         return;
    //     }

    //     openChannel.enter(function(response, error) {
    //         console.log("hi")
    //         if (error) {
    //             return;
    //         }
    //     })
    //     //send message
    //     var MESSAGE = 'Hi, how are you?'
    //     openChannel.sendUserMessage(MESSAGE, function(message, error) {
    //         console.log("hi")
    //         if (error) {
    //             console.log(`error ${error}`)
    //             return;
    //         }
    //         console.log('Message sent:', message.message);
    //     });

    // });
    // });




async function getBotList() {
    const response = await axios.get(ENTRYPOINT, {
        headers: { 
            "Api-Token": TOKEN,
            'Content-Type': 'application/json'
        }
    });
    const data = response.data
    return data;
}

async function createBot(params) {
    const response = await axios.post(ENTRYPOINT, params, {
        headers: { 
            "Api-Token": TOKEN,
            'Content-Type': 'application/json'
        },
    });
    const data = response.data
    return data.bots;
}

async function updateBot(botId, params) {
    const response = await axios.put(ENTRYPOINT + '/' + botId, params, {
        headers: { 
            "Api-Token": TOKEN,
            'Content-Type': 'application/json'
        },
    });
    const data = response.data
    return data.bots;
}

async function addBotToChannel(botId, channelUrl) {
    const params = {
        'channel_urls': [ channelUrl ]
    };
    const response = await axios.post(ENTRYPOINT + '/' + botId + '/channels', params, {
        headers: { 
            "Api-Token": TOKEN,
            'Content-Type': 'application/json'            
        },
    });
    const data = response.data;
    return data;
}

async function fromDialogFlowSendMessageToChannel(queryText, channelUrl, botId) {
    const params = {
        message: queryText,
        channel_url: channelUrl
    }
    await axios.post(ENTRYPOINT + '/' + botId + '/send', params, {
        headers: { 
            "Api-Token": TOKEN,
            'Content-Type': 'application/json'
        },
    });
}

function sendToDialogFlow(message, callback) {
    try {
        const queries = [
            message
        ];
        const response = executeQueries(DIALOGFLOW_PROJECT_ID, GOOGLE_SESSION_ID, queries, DIALOGFLOW_LANG, callback);    
        return response;
    } catch (error) {
        console.log(error)
    }
}

async function executeQueries(projectId, sessionId, queries, languageCode, callback) {
    let context;
    let intentResponse;
    for (const query of queries) {
        try {
            intentResponse = await detectIntent(
                projectId,
                sessionId,
                query,
                context,
                languageCode
            );
            console.log(intentResponse.queryResult);
            const responseText = intentResponse.queryResult.fulfillmentText;
            context = intentResponse.queryResult.outputContexts;
            callback(responseText);
        } catch (error) {
            console.log(error);
            callback('Error from DialogFlow: ' + error);
        }
    }
}

async function detectIntent(projectId, sessionId, query, contexts, languageCode) {
    const sessionClient = new dialogflow.SessionsClient();
    const sessionPath = sessionClient.projectAgentSessionPath(
        projectId,
        sessionId
    );
    const request = {
        session: sessionPath,
        queryInput: {
        text: {
            text: query,
            languageCode: languageCode,
        },
        },
    };
    if (contexts && contexts.length > 0) {
        request.queryParams = {
        contexts: contexts,
        };
    }
    const responses = await sessionClient.detectIntent(request);
    return responses[0];
}
