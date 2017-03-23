var connect = require('connect');
var http = require('http');
var net = require('net');
var app = connect();
// require request-ip and register it as middleware
var requestIp = require('request-ip');

var request = require('request');

// Load all essential modules for manipulating fbuser system
var builder = require('botbuilder');
var restify = require('restify');
var Store = require('./store');
var spellService = require('./spell-service');


var users = require('./users');


// This loads the environment variables from the .env file
require('dotenv-extended').load();



// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log('%s listening to %s', server.name, server.url);
});

// Create chat bot
var connector = new builder.ChatConnector({
    appId: "0e4ad4e8-25e1-44b1-bfa6-6d0cd029a5f8",
    appPassword: "w5igphWF1rDqCuNjBgNxHWK"
});
var bot = new builder.UniversalBot(connector);
server.use(restify.bodyParser());

server.post('/api/messages', connector.listen());

// 
// server.post('/api/register', function (req, res) {
//     global_id = req.params.UserID;
// });
//


// server.post('/api/messages', function(req, res, next){
//  console.log(req.params);
//   var ip = req.headers['x-forwarded-for'] || 
//      req.connection.remoteAddress || 
//      req.socket.remoteAddress ||
//      req.connection.socket.remoteAddress;
//      console.log(ip);
//      users.InsertNewRecord;
//  res.send(200);
//  res.end();
// })  ;






// You can provide your own model by specifing the 'LUIS_MODEL_URL' environment variable
// This Url can be obtained by uploading or creating your model from the LUIS portal: https://www.luis.ai/


const LuisModelUrl = 'https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/00d6a6ad-2b11-4394-85fc-3d3caf93dbfe?subscription-key=a1f42de5ed314293b43575812478fbf8&verbose=true&q=';


// Main dialog with LUIS
var recognizer = new builder.LuisRecognizer(LuisModelUrl);


//Sends greeting message when the bot is first added to a conversation
bot.on('conversationUpdate', message => {
    if (message.membersAdded) {
        message.membersAdded.forEach(identity => {
            if (identity.id === message.address.bot.id) {
                const reply = new builder.Message()
                    .address(message.address)
                    .text('Welcome to Embright, I can guide you to learn anything with the best online and offline resourses, and connect you to people who can help you learn.');
                bot.send(reply);
                console.log(message.address);
                console.log("The userid is: " + message.address.user.id);
            }
        });
    }
});

//handle
bot.dialog('/', new builder.IntentDialog({ recognizers: [recognizer] })
//Greetings
    .matches('greetings', [
        function (session, args, next) {
            var learner = builder.EntityRecognizer.findEntity(args.entities, 'learner');
            session.send('Hi '+ session.message.address.user.name +' this is Satya, I am your AI mentor, how can I help you?', session.message.text);
            console.log(session.message.text);
                //sample request
                var myJSONObject = 
                {
                    "documents": [
                        {
                        "language": "en",
                        "id": "123345",
                        "text": session.message.text
                        }
                    ]
                };
                request({
                    url: "https://westus.api.cognitive.microsoft.com/text/analytics/v2.0/keyPhrases",
                    method: "POST",
                    headers: {
                    "content-type": "application/json",
                    "Ocp-Apim-Subscription-Key": "6951188cf7d44a57b8df9f7a630ce36a"
                    },
                    json: true,   // <--Very important!!!
                    body: myJSONObject
                    
                }, 
                function(err, res, body) {
                    var myans = body["documents"][0]["keyPhrases"][0];
                    console.log(body["documents"]);
                    console.log(myans);
                    console.log(body["documents"][0]["keyPhrases"].length);
  // `body` is a js object if request was successful
                });
                //end of sample request

                
  }
    ])

//Get Definition
    .matches('get_definition', [
        function (session, args, next) 
            {
            var address = session.message.address;
            var query = builder.EntityRecognizer.findEntity(args.entities, 'def_search');
            var queryUrl = "https://en.wikipedia.org/w/api.php?format=json&action=query&generator=search&gsrnamespace=0&gsrlimit=10&prop=extracts&exintro&explaintext&exsentences=5&exlimit=max&gsrsearch=" + query.entity;
            request({
                    url: queryUrl,
                    method: "POST",
                    json: true,   // <--Very important!!!
                    
                }, 
                function(err, res, body) {
                    //var myans = JSON.stringify(body);
                    //console.log(body.query);
                    //var body = JSON.stringify(body);
                    var realpages = body.query.pages;
                    var cards = new Array();
                    var counter = 0;
                    for (var i = 0 in realpages) 
                    {
                    if (counter > 4) { break; }
                    cards.push(constructwikiCard(realpages[i]));
                    console.log(realpages[i].title);
                    counter = counter + 1;
                    }
                    // create reply with Carousel AttachmentLayout
                    
                    const reply = new builder.Message()
                        .address(address)
                        .text('Here are the results I found about the meaning of [' + query.entity+']')
                        .attachmentLayout(builder.AttachmentLayout.carousel)
                        .attachments(cards);
                    bot.send(reply);
                    //create cards
                    

                    
                // `body` is a js object if request was successful
                });
                //end of request

            }
    ])

//Get Learning Plan
    .matches('get_learning_plan', [

        function (session, args, next) {
            topic_to_learn_ID = builder.EntityRecognizer.findEntity(args.entities, 'topic_to_learn');
            builder.Prompts.text(session, 'Sure, can you please also tell me about your goals or anything you want to achieve after learning about this topic?');
            //Text analytics request
                var myJSONObject = 
                {
                    "documents": [
                        {
                        "language": "en",
                        "id": "123345",
                        "text": topic_to_learn_ID
                        }
                    ]
                };
                request({
                    url: "https://westus.api.cognitive.microsoft.com/text/analytics/v2.0/keyPhrases",
                    method: "POST",
                    headers: {
                    "content-type": "application/json",
                    "Ocp-Apim-Subscription-Key": "6951188cf7d44a57b8df9f7a630ce36a"
                    },
                    json: true,   // <--Very important!!!
                    body: myJSONObject
                    
                }, 
                function(err, res, body) {
                    var myans = JSON.stringify(body);
                    console.log(myans);
                // `body` is a js object if request was successful
                });
                //end of request
        },
        function (session, results, next) {
            var learning_goals = results.response;
            learning_goals_ID = learning_goals;
            //sample request
                var myJSONObject = 
                {
                    "documents": [
                        {
                        "language": "en",
                        "id": session.message.address.user.id,
                        "text": learning_goals_ID
                        }
                    ]
                };
                request({
                    url: "https://westus.api.cognitive.microsoft.com/text/analytics/v2.0/keyPhrases",
                    method: "POST",
                    headers: {
                    "content-type": "application/json",
                    "Ocp-Apim-Subscription-Key": "6951188cf7d44a57b8df9f7a630ce36a"
                    },
                    json: true,   // <--Very important!!!
                    body: myJSONObject
                    
                }, 
                function(err, res, body) {
                    var myans = body["documents"][0]["keyPhrases"];
                    console.log(body["documents"]);
                    console.log("Keywords: "+myans);
                    console.log("Keywords length: "+body["documents"][0]["keyPhrases"].length);
                    for(var i = 0; i < body["documents"][0]["keyPhrases"].length; i++) 
                    {
                        console.log(myans[i]);
                    }
                 // `body` is a js object if request was successful
                });
                //end of sample request
            next();
        },
        function (session, args, next) {
            builder.Prompts.text(session, 'Could you also describe a bit about yourself and your needs? For example are you a beginner or advanced learner to the topic? You can also tell me about your education background/preferences in learning, thank you!');
        },
        function (session, results, next) {
            var learner_des = results.response;
            learner_des_ID = learner_des;
            session.send('Got it! let me do some research and analysis...', session.message.text);
            next();
        },
        function (session, args, next) {
            session.send('Here you are:) These are the topics related to ' + topic_to_learn_ID.entity +' for you to start with.', session.message.text);
            // create reply with Carousel AttachmentLayout
            var cards = getCardsAttachments();
            var reply = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments(cards);
            session.send(reply);
            builder.Prompts.text(session, 'please choose the one you are most interested in!');
        },
        function (session, results,next) {
            var topic_to_learn = results.response;
            topic_to_learn_ID = topic_to_learn;
            session.send('Nice choice! I am formulating some learning plans for you!', session.message.text);
            var cards = getCardsAttachments();
            var reply = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments(cards);
            session.send(reply);
            builder.Prompts.text(session, 'Try one of these learning plan!');
        },
         function (session, results,next) {
            var plan_chosen = results.response;
            plan_chosen_ID = plan_chosen;
            session.send('Got it! The learning plan has been added to your profile! Start with the materials and opportunities in it, I will keep track of your progress and guide you!:)', session.message.text);
         }
        
    ])

    .onDefault((session) => {
        
        session.send('Sorry, I did not understand \'%s\'. Type \'help\' if you need assistance.', session.message.text);
    }));

if (process.env.IS_SPELL_CORRECTION_ENABLED === 'true') {
    bot.use({
        botbuilder: function (session, next) {
            spellService
                .getCorrectedText(session.message.text)
                .then(text => {
                    session.message.text = text;
                    next();
                })
                .catch((error) => {
                    console.error(error);
                    next();
                });
        }
    });
}

//wikians
function constructwikiCard(page) {
                        return new builder.HeroCard()
                            .title(page.title)
                            .subtitle(page.extract.substr(0, 600).trim()+'...')
                            .buttons([
                                new builder.CardAction()
                                    .title('More about this definition')
                                    .type('openUrl')
                                    .value("https://en.wikipedia.org/?curid=" + page.pageid)
                            ]);
                    }


//topiccard
// function topic_card() {
//     return new builder.HeroCard()
//         .title(hotel.name)
//         .subtitle('%d stars. %d reviews. From $%d per night.', hotel.rating, hotel.numberOfReviews, hotel.priceStarting)
//         .images([new builder.CardImage().url(hotel.image)])
//         .buttons([
//             new builder.CardAction()
//                 .title('More details')
//                 .type('openUrl')
//                 .value('https://www.bing.com/search?q=hotels+in+' + encodeURIComponent(hotel.location))
//         ]);
// }

//cards
function getCardsAttachments(session) {
    return [

        new builder.ThumbnailCard(session)
            .title('Topic1')
            .subtitle('Description of topic1')
            .text('Even more description of topic1')
            .images([
                builder.CardImage.create(session, 'https://azurecomcdn.azureedge.net/cvt-68b530dac63f0ccae8466a2610289af04bdc67ee0bfbc2d5e526b8efd10af05a/images/page/services/cognitive-services/cognitive-services.png')
            ])
            .buttons([
                builder.CardAction.openUrl(session, 'https://azure.microsoft.com/en-us/services/cognitive-services/', 'Start with this')
            ]),
            
        new builder.ThumbnailCard(session)
            .title('Topic1')
            .subtitle('Description of topic1')
            .text('Even more description of topic1')
            .images([
                builder.CardImage.create(session, 'https://azurecomcdn.azureedge.net/cvt-68b530dac63f0ccae8466a2610289af04bdc67ee0bfbc2d5e526b8efd10af05a/images/page/services/cognitive-services/cognitive-services.png')
            ])
            .buttons([
                builder.CardAction.openUrl(session, 'https://eebbc576.ngrok.io', title = 'Log in')
            ]),

        new builder.ThumbnailCard(session)
            .title('Topic1')
            .subtitle('Description of topic1')
            .text('Even more description of topic1')
            .images([
                builder.CardImage.create(session, 'https://azurecomcdn.azureedge.net/cvt-68b530dac63f0ccae8466a2610289af04bdc67ee0bfbc2d5e526b8efd10af05a/images/page/services/cognitive-services/cognitive-services.png')
            ])
            .buttons([
                builder.CardAction.imBack(session, msg = 'topic3',title = 'Start with this')
            ])
    ];
}



function EnrollPlan(PlanID,UserID) {
        var sql = require('mssql');
        var config = require('./configuration/sqlconfig');
        var conn = new sql.Connection(config);
        var req = new sql.Request(conn);
        conn.connect(function (err) {
            if (err) {
                console.log(err);
                return;
            } 
            console.log('Attempting to Insert new plan enrollment record...');
            req.query("INSERT INTO dbo.PlanEnrollment (PlanID, UserID) VALUES ('" + PlanID + "', '" + UserID + "');", function (err) {
                if (err) {
                    console.log(err);
                } else {
                    console.log("Added one new enrollment record");
                }
                conn.close();
            });
        });
    }



//                     //sample request
//                 var myJSONObject = 
//                 {
//                     "documents": [
//                         {
//                         "language": "en",
//                         "id": "123345",
//                         "text": session.message.text
//                         }
//                     ]
//                 };
//                 request({
//                     url: "https://westus.api.cognitive.microsoft.com/text/analytics/v2.0/keyPhrases",
//                     method: "POST",
//                     headers: {
//                     "content-type": "application/json",
//                     "Ocp-Apim-Subscription-Key": "6951188cf7d44a57b8df9f7a630ce36a"
//                     },
//                     json: true,   // <--Very important!!!
//                     body: myJSONObject
                    
//                 }, 
//                 function(err, res, body) {
//                     var myans = body["documents"][0]["keyPhrases"][0];
//                     console.log(body["documents"]);
//                     console.log(myans);
//                     console.log(body["documents"][0]["keyPhrases"].length);
//   // `body` is a js object if request was successful
//                 });
//                 //end of sample request