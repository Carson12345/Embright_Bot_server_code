//load needed modules
var connect = require('connect');
var http = require('http');
var net = require('net');
var app = connect();
// require request-ip and register it as middleware
var requestIp = require('request-ip');
var request = require('request');
var builder = require('botbuilder');
var restify = require('restify');
var Store = require('./store');
var spellService = require('./spell-service');
var mssql = require('mssql');
var updatecount = 0;


var users = require('./users');
var plans = require('./plans');


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

                });
                //end of sample request

                var chkuserid = Number(session.message.address.user.id);
                var counter = 0;
                console.log(chkuserid);
                plans.CheckEnrolledPlanCompletion(chkuserid, function (fetchedcompletionrecord) {
                    for (var prop in fetchedcompletionrecord) {
                        console.log(fetchedcompletionrecord[prop].PlanTitle);
                        
                        if (fetchedcompletionrecord[prop].Completed == 1) {
                                counter = counter + 1;
                        }
                        if (counter > 1) {
                            const reply = new builder.Message()
                                .address(message.address)
                                .text('Hey you got two updates: Resources Updates(2) \n Learning updates(1)');
                            bot.send(reply); 
                        }

                    } 
                });

                
                

                
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
            //ID is not id, it means it is a unique record
            topic_to_learn = builder.EntityRecognizer.findEntity(args.entities, 'topic_to_learn');
            topic_to_learn_ID = topic_to_learn.entity;
            builder.Prompts.text(session, 'Sure, can you please also tell me about your goals or anything you want to achieve after learning about this topic?');
            //sample request
                var myJSONObject = 
                {
                    "documents": [
                        {
                        "language": "en",
                        "id": session.message.address.user.id,
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
                    console.log(body);
                    var keyword = body["documents"][0]["keyPhrases"];
                    console.log(body["documents"]);
                    console.log("Keywords: "+keyword);
                    console.log("Keywords length: "+body["documents"][0]["keyPhrases"].length);
                    topic_key = keyword[0];
                    for(var i = 0; i < body["documents"][0]["keyPhrases"].length; i++) 
                    {
                        console.log(keyword[i]);
                    }
                 // `body` is a js object if request was successful
                });
                //end of sample request
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
                    var keyword = body["documents"][0]["keyPhrases"];
                    console.log(body["documents"]);
                    console.log("Keywords: "+keyword);
                    console.log("Keywords length: "+body["documents"][0]["keyPhrases"].length);
                    goal_key = keyword[0];
                    for(var i = 0; i < body["documents"][0]["keyPhrases"].length; i++) 
                    {
                        console.log(keyword[i]);
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
            //sample request
                var myJSONObject = 
                {
                    "documents": [
                        {
                        "language": "en",
                        "id": session.message.address.user.id,
                        "text": learner_des_ID
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
                    var keyword = body["documents"][0]["keyPhrases"];
                    console.log(body["documents"]);
                    console.log("Keywords: "+keyword);
                    console.log("Keywords length: "+body["documents"][0]["keyPhrases"].length);
                    des_key = keyword[0];
                    for(var i = 0; i < body["documents"][0]["keyPhrases"].length; i++) 
                    {
                        console.log(keyword[i]);
                    }
                 // `body` is a js object if request was successful
                });
                //end of sample request
            
            next();
        },
        function (session, args, next) {
            var address = session.message.address;
            plans.LoadAllPlanTopics(topic_key, function (fetchedtopicssbytopickey) {
                for (var prop in fetchedtopicssbytopickey) {
                    console.log("The relevant topics on database are: " + fetchedtopicssbytopickey[prop].PlanTopic);
                    var cards = new Array();
                    cards.push(topic_create(fetchedtopicssbytopickey, prop));
                    const reply = new builder.Message()
                        .address(address)
                        .text('These are the relevant topics related to ' + topic_to_learn_ID.entity +' for you to start with.')
                        .attachmentLayout(builder.AttachmentLayout.carousel)
                        .attachments(cards);
                    bot.send(reply);
                    

                }
            });
            // create reply with Carousel AttachmentLayout
            builder.Prompts.text(session, 'please choose the one you are most interested in!');
        },
        function (session, results,next) {
            var address = session.message.address;
            
            var topic_to_learn = results.response;
            topic_to_learn_ID = topic_to_learn;
            session.send('Nice choice! I am formulating some learning plans for you!', session.message.text);
            //Find a right plan
            plans.LoadSpecificPlanByPlanTopic(topic_to_learn_ID, function (fetchedplansbytopic) {
                plans.LoadSpecificPlanByLearningOutcomes(goal_key, function (fetchedplansbygoal) {
                    console.log(fetchedplansbytopic[0].PlanTitle);
                    console.log("XXXXXXXXX");
                    //createcards
                    var cards = new Array();
                    //for (i = 0; i < 2; i++) { 
            
                    cards.push(topic_card(fetchedplansbytopic));
                    
                    // create reply with Carousel AttachmentLayout
                    
                    const reply = new builder.Message()
                        .address(address)
                        .text('Here are my suggested plans')
                        .attachmentLayout(builder.AttachmentLayout.carousel)
                        .attachments(cards);
                    bot.send(reply);
                });
            });
            //create cards
            builder.Prompts.text(session, 'Try one of these learning plan!');
        },
         function (session, results,next) {
            var userid = session.message.address.user.id;
            var plan_chosen = results.response;
            plan_chosen_ID = plan_chosen;
            plans.EnrollPlan(results.response , userid);
            session.send('Got it! The learning plan has been added to your profile! \n Start with the materials and opportunities in it, I will keep track of your progress and guide you!:)', session.message.text);
         
         }
                
    ])




//Check updates resources
    .matches('update_res', [
        function (session, args) 
            {
                var cards = createresCard(session);
                // attach the card to the reply message
                var reply = new builder.Message(session)
                    .text('These useful learning resources are going to expire! \n Do not miss them!')
                    .attachmentLayout(builder.AttachmentLayout.carousel)
                    .attachments(cards);
                session.send(reply);
            }
    ])

//Check updates learn
    .matches('update_learning', [
        function (session, args, next) 
            {
                var cards = createlearnCard(session);
                // attach the card to the reply message
                var reply = new builder.Message(session)
                    .text('As you have finished one learning plan for your saved goals. These are the more advanced topic for you to explore further')
                    .attachmentLayout(builder.AttachmentLayout.carousel)
                    .attachments(cards);
                session.send(reply);

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
function topic_card(planobj) {
    return new builder.HeroCard()
        .title(planobj[0].PlanTitle)
        .subtitle(planobj[0].PlanDetails)
        //.images([new builder.CardImage().url()])
        .buttons([
            new builder.CardAction.postBack()
                                    .title('Add this to my profile')
                                    .type('postBack')
                                    .value(planobj[0].PlanID)
        ]);
}

//topic cards
function topic_create(topicobj,prop) {
    return new builder.HeroCard()
        .title(topicobj[prop].PlanTopic)
        //.images([new builder.CardImage().url()])
        .buttons([
            new builder.CardAction.postBack()
                                    .title('Start with this')
                                    .type('imBack')
                                    .value(topicobj[prop].PlanTopic)
        ]);
}



//cards
function createlearnCard(session) {
    return [
        new builder.HeroCard(session)
        .title('Cinematography')
        .buttons([
            builder.CardAction.imBack(session, 'Directing', 'Learn this topic')
        ]),

        new builder.HeroCard(session)
        .title('Directing')
        .buttons([
            builder.CardAction.imBack(session, 'Directing', 'Learn this topic')
        ]),

        new builder.HeroCard(session)
        .title('Production Design')
        .buttons([
            builder.CardAction.imBack(session, 'Directing', 'Learn this topic')
        ])
    ]
}
//opportunities update

function createresCard(session) {
    return [ 
        new builder.HeroCard(session)
        .title('Free Course: Visual Design and Motion Graphics')
        .subtitle('Application Deadline: 26/3/2017')
        .text('The last 3 free course of General Assembly Hong Kong, this one is especially designers and directors to be to learn about the concepts in visual design, which will help you to develop in many field......')
        .images([
            builder.CardImage.create(session, 'https://ga-shop-production-herokuapp-com.global.ssl.fastly.net/assets/images/logo_1200_by_627_1QIVL.jpg')
        ])
        .buttons([
            builder.CardAction.openUrl(session, 'https://generalassemb.ly/education/visual-design', 'Apply Now')
        ]),

        new builder.HeroCard(session)
        .title('第四屆全港中學微電影創作大賽')
        .subtitle('2017年3月28日截止')
        .text('以微電影手法拍攝一個以燦爛人生作主題, 有了正能量我們便可以積極面對任何困難, 勇敢迎接每項挑戰, 通過幫助別人令自己人生更燦爛......')
        .images([
            builder.CardImage.create(session, 'http://www.ymca.org.hk/sites/ymca_main/files/default_images/ymca_banner_0.jpg')
        ])
        .buttons([
            builder.CardAction.openUrl(session, 'http://www.ymca.org.hk/zh-hant/minimovie2016/', 'Apply Now')
        ])   
    ]
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