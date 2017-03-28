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
                    .text('Welcome back! You have some new event and job updates. Say Hi to activate Muse.');
                    
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
            // session.send('Hi '+ session.message.address.user.name +' this is Muse, tell me what you are working on or what you want to find. I will get you the inspiration you need.', session.message.text);
            console.log(session.message.text);
                var cards = greetingcard(session);
                // attach the card to the reply message
                var reply = new builder.Message(session)
                    .text('Hi, '+ session.message.address.user.name +'! I am ready to get the inspiration and learning references you need. How can I help you?')
                    .attachmentLayout(builder.AttachmentLayout.carousel)
                    .attachments(cards);
                session.send(reply);
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
            console.log(session);
            //ID is not id, it means it is a unique record
            topic_to_learn = builder.EntityRecognizer.findEntity(args.entities, 'topic_to_learn');
            topic_to_learn_ID = topic_to_learn.entity;
            builder.Prompts.text(session, 'Understood, let me find some projects that match what you just described.');
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
            builder.Prompts.text(session, 'Click one of them then I will help you put it in your collection!');
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
                // var cards = createresCard(session);
                // // attach the card to the reply message
                // var reply = new builder.Message(session)
                //     .text('These useful learning resources are going to expire! \n Do not miss them!')
                //     .attachmentLayout(builder.AttachmentLayout.carousel)
                //     .attachments(cards);
                // session.send(reply);
            plans.LoadAllPlans(function (fetchedplan) {
                var fetchedplan = fetchedplan;
                console.log(fetchedplan);
                console.log(fetchedplan[0]['PlanTitle']);
                console.log(fetchedplan[0]['PlanTitle']);
                fetchedplan[0].score = "1";
                console.log(fetchedplan);

            });

        }        
])

//Check updates learn
    .matches('update_learning', [
        function (session, args, next) 
            {

            builder.Prompts.text(session, 'Got it, can you describe what you are looking for? (e.g. I want to find someone doing xxx/I want to learn how to xxx');
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
                    //another request for the proj content
                            plans.LoadAllPlans(function (fetchedplan) {
                                console.log(fetchedplan);
                                var arr = [];
                                
                                
                            var counter = 0;
                            for (var k in fetchedplan) {
                                    
                                    var k_score;
                                    var index = fetchedplan.findIndex(x => x.PlanID==fetchedplan[k]['PlanID']);
                                    console.log(index);
                                    var Projdes = 
                                    {
                                        "documents": [
                                            {
                                            "language": "en",
                                            "id": index,
                                            "text": fetchedplan[k]['PlanDetails']
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
                                    body: Projdes
                                    }, 
                                    function(err, res, body) {

                                        var keyword_proj = body["documents"][0]["keyPhrases"];
                                        keyword = keyword.join(' ').split(' ');
                                        keyword_proj = keyword_proj.join(' ').split(' ');
                                        console.log(body["documents"]);
                                        console.log("Keywords: "+keyword_proj);
                                        console.log("Keywords length: "+body["documents"][0]["keyPhrases"].length); 
                                        console.log("Set1: "+keyword);
                                        console.log("Set2: "+keyword_proj);
                                        var arr_req = Object.keys(keyword).map(function (key) { return keyword[key]; });
                                        var arr_proj = Object.keys(keyword_proj).map(function (key) { return keyword_proj[key]; });
                                        console.log("Score: " + intersect_arr(arr_req,arr_proj).length);
                                        k_score = intersect_arr(arr_req,arr_proj).length;
                                        // fetchedplan[k].mark = k_score;
                                        // console.log(fetchedplan[k]);
                                        var plankey = body["documents"][0]["id"];
                                        arr.push({plankey,k_score});
                                        
                                        
                                        
                                        plans.LoadAllPlans(function (fetchedplan2) {
                                            var byscore = arr.slice(0);
                                            byscore.sort(function(a,b) {
                                                return b.k_score - a.k_score;
                                            });
                                            console.log(byscore);
                                            console.log(fetchedplan2.length);
                                            var cards = new Array();
                                            for (var l = 0; l < byscore.length; l++) {
                                                cards.push(topic_card(fetchedplan,byscore[l]['plankey']));
                                            }
                                            counter = counter + 1;
                                            if (counter == fetchedplan2.length) {
                                            const reply = new builder.Message()
                                                                        .address(session.message.address)
                                                                        .text('These projects match what you just told me!')
                                                                        .attachmentLayout(builder.AttachmentLayout.carousel)
                                                                        .attachments(cards);
                                            bot.send(reply);
                                            }
                                        });                             
                                    });  
                            }
                        });
                    
                });
                //end of sample request
            
            next();
        },
    ])





    .onDefault((session) => {

        // console.log(session.message.attachments[0]['contentUrl']);
        // session.send(session.message.attachments[0]['contentUrl'], session.message.text);
        var cards = greetingcard(session);
                // attach the card to the reply message
                var reply = new builder.Message(session)
                    .text('I understand but so far I can only provide the following functions. Sorry')
                    .attachmentLayout(builder.AttachmentLayout.carousel)
                    .attachments(cards);
                session.send(reply);
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



//
const arrayColumn = (arr, n) => arr.map(x => x[n]);

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
function topic_card(planobj,key) {
    return new builder.HeroCard()
        .title(planobj[key]['PlanTitle'])
        .subtitle(planobj[key]['PlanDetails'])
        //.images([new builder.CardImage().url()])
        .buttons([
            new builder.CardAction.postBack()
                                    .title('Add this to my profile')
                                    .type('postBack')
                                    .value(planobj[key]['PlanID'])
        ]);
}

//find value


//create Array
function Create2DArray(rows) {
  var arr = [];

  for (var i=0;i<rows;i++) {
     arr[i] = [];
  }

  return arr;
}


//find interaction of Array
function intersect_arr(a, b)
{
  var ai=0, bi=0;
  var result = [];

  while( ai < a.length && bi < b.length )
  {
     if      (a[ai] < b[bi] ){ ai++; }
     else if (a[ai] > b[bi] ){ bi++; }
     else /* they're equal */
     {
       result.push(a[ai]);
       ai++;
       bi++;
     }
  }

  return result;
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



//jobcards
function jobcard(session) {
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

//greeting cards
function greetingcard(session) {
    return [
        new builder.HeroCard(session)
        .title('Find Projects')
        .subtitle('Want to find projects similar to what you are working on? Want to learn specific technical skills? Get inspired and learn from the projects of others!')
        .buttons([
            builder.CardAction.imBack(session, 'I want to find some projects', 'Click here to start')
        ]),

        new builder.HeroCard(session)
        .title('Get job/freelance opportunities')
        .subtitle('Describe the opportunity you are looking for! I will get you the perfect match.')
        .buttons([
            builder.CardAction.imBack(session, 'Get job/freelance opportunities', 'Click here to start')
        ]),

        new builder.HeroCard(session)
        .title('Get events/workshop recommendation')
        .subtitle('Get recommendation of events/talks/workshops/conferences according to your requirement')
        .buttons([
            builder.CardAction.imBack(session, 'Get events/workshop recommendation', 'Click here to start')
        ]),

        new builder.HeroCard(session)
        .title('Get jargons definition')
        .subtitle('Just ask me a question like "What is xxx?" or "Define xxx"')
    ]
}
//opportunities update

function eventcard(session) {
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