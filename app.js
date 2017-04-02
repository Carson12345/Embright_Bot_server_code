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


var fs = require('fs');




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
                    .text('Welcome back! Say Hi to activate Muse.');
                    
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
                // //sample request
                // var myJSONObject = 
                // {
                //     "documents": [
                //         {
                //         "language": "en",
                //         "id": "123345",
                //         "text": session.message.text
                //         }
                //     ]
                // };
                // request({
                //     url: "https://westus.api.cognitive.microsoft.com/text/analytics/v2.0/keyPhrases",
                //     method: "POST",
                //     headers: {
                //     "content-type": "application/json",
                //     "Ocp-Apim-Subscription-Key": "6951188cf7d44a57b8df9f7a630ce36a"
                //     },
                //     json: true,   // <--Very important!!!
                //     body: myJSONObject
                    
                // }, 
                // function(err, res, body) {
                //     var myans = body["documents"][0]["keyPhrases"][0];
                //     console.log(body["documents"]);
                //     console.log(myans);
                //     console.log(body["documents"][0]["keyPhrases"].length);

                // });
                // //end of sample request

                
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
                    try {
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
                    
                    } catch(error) 
                        {
                        const reply = new builder.Message()
                            .address(address)
                            .text('Sorry I cannot find any definition of [' + query.entity+']')
                        bot.send(reply);
                        }
                });
                //end of request

            }
    ])

//Check updates resources
    .matches('getevent', [
        function (session, args, next) 
            {
                var cards = eventcard(session);
                // attach the card to the reply message
                var reply = new builder.Message(session)
                    .text('By studying your preferences, I think you will be interested in these events!')
                    .attachmentLayout(builder.AttachmentLayout.carousel)
                    .attachments(cards);
                session.send(reply);
                
            // plans.LoadAllPlans(function (fetchedplan) {
            //     var fetchedplan = fetchedplan; 
            //     console.log(fetchedplan);
            //     console.log(fetchedplan[0]['PlanTitle']);
            //     console.log(fetchedplan[0]['PlanTitle']);
            //     fetchedplan[0].score = "1";
            //     console.log(fetchedplan);

            // });
        next();

        },
         function (session, args, next) {
            builder.Prompts.text(session, 'I can also find events according to your requirements. Any specific event you want to find?');
        },
        function (session, results, next) {
            var learner_des = results.response;
            learner_des_ID = learner_des;
            session.send('Got it! Please note that we will also record your search data for more accurate recommendation next time', session.message.text);
            session.send('We have finished by setting up our ML studio web services, we are still working on the Post an event/a job module, this smart recommendation module leveraging Azure Machine Learning will soon be live!', session.message.text);
        }        
])

//Getjobs
    .matches('getjob', [
        function (session, args, next) 
            {
                var cards = eventcard(session);
                // attach the card to the reply message
                var reply = new builder.Message(session)
                    .text('By studying your preferences, I think you will be interested in these positions!')
                    .attachmentLayout(builder.AttachmentLayout.carousel)
                    .attachments(cards);
                session.send(reply);
                
            // plans.LoadAllPlans(function (fetchedplan) {
            //     var fetchedplan = fetchedplan; 
            //     console.log(fetchedplan);
            //     console.log(fetchedplan[0]['PlanTitle']);
            //     console.log(fetchedplan[0]['PlanTitle']);
            //     fetchedplan[0].score = "1";
            //     console.log(fetchedplan);

            // });
        next();

        },
         function (session, args, next) {
            builder.Prompts.text(session, 'I can also find jobs according to your requirements. Please tell me your requirement');
        },
        function (session, results, next) {
            var learner_des = results.response;
            learner_des_ID = learner_des;
            session.send('We have finished by setting up our ML studio web services, we are still working on the Post an event/a job module, this smart recommendation module leveraging Azure Machine Learning will soon be live!', session.message.text);
        }        
])

//Getjobs
    .matches('findppl', [
         function (session, args, next) {
            builder.Prompts.text(session, 'Please describe what kind of creators you are interested in, thank you.');
        },
        function (session, results, next) {
            var learner_des = results.response;
            learner_des_ID = learner_des;
                var cards = pplcard(session);
                // attach the card to the reply message
                var reply = new builder.Message(session)
                    .text('Here are the creators on Embright that match your request')
                    .attachmentLayout(builder.AttachmentLayout.carousel)
                    .attachments(cards);
                session.send(reply);
        }        
])

//Check updates learn
    .matches('getproject', [
        function (session, args, next) 
            {

            builder.Prompts.text(session, 'Got it, can you describe what you are looking for? (e.g. I am working on a project about ...... / I want to find someone doing ...... / I want to learn how to ......)');
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
                                                                        .text('These projects match what you just told me! (Arranged by relevance)')
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
            
            
            builder.Prompts.text(session, 'Click one of the following then I will add it into your collection!');
        },
         function (session, results,next) {
            var userid = session.message.address.user.id;
            var plan_chosen = results.response;
            plan_chosen_ID = plan_chosen;
            plans.EnrollPlan(results.response , userid);
            session.send('Got it! This project has been saved to your collection. Make the best use of it! Your choice and search record will be analysed for more accurate prediction next time'), session.message.text;
            //send data to database for learning - send plan title chosen, search request, plan id
         
         }
        
    ])





    .onDefault((session) => {
        try {
            console.log(session.message.attachments[0]['contentUrl']);
            session.send('Your file has been hosted temporalily! Please use the following url', session.message.text);
            session.send(session.message.attachments[0]['contentUrl'], session.message.text);
            
        }
        catch(error) {
                var cards = greetingcard(session);
                // attach the card to the reply message
                var reply = new builder.Message(session)
                    .text('I understand but so far I can only provide the following functions. Sorry')
                    .attachmentLayout(builder.AttachmentLayout.carousel)
                    .attachments(cards);
                session.send(reply);
        }

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





//download picture

var downloadpic = function(uri, filename, callback){
  request.head(uri, function(err, res, body){
    console.log('content-type:', res.headers['content-type']);
    console.log('content-length:', res.headers['content-length']);

    request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
  });
};



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
        //.subtitle(planobj[key]['PlanDetails'])
        .subtitle('This is a taiwan individual documentary project about a daugther and her lesbian mother')
        .images([
            builder.CardImage.create(null, (planobj[key]['PlanPicture']))
        ])
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
// function topic_create(topicobj,prop) {
//     return new builder.HeroCard()
//         .title(topicobj[prop].PlanTopic)
//         //.images([new builder.CardImage().url()])
//         .images([
//             builder.CardImage.create(session, 'https://embrightweb.azurewebsites.net/public/' + topicobj[prop].PlanPicture)
//         ])
//         .buttons([
//             new builder.CardAction.postBack()
//                                     .title('Start with this')
//                                     .type('imBack')
//                                     .value(topicobj[prop].PlanTopic)
//         ]);
// }




//jobcards
function jobcard(session) {
    return [ 
        new builder.HeroCard(session)
        .title('Position: UX/UI Senior Designer')
        .subtitle('Company: Emotio Design Group')
        .text('Northwood, United Kingdom')
        .images([
            builder.CardImage.create(session, 'https://pbs.twimg.com/media/Cu30JsSUkAA2LU5.jpg')
        ])
        .buttons([
            builder.CardAction.openUrl(session, 'https://emotio.typeform.com/to/D8gu3n', 'Apply Now')
        ]),

        new builder.HeroCard(session)
        .title('Digital Art Director')
        .subtitle('Company: One Rockwell')
        .text('New York, NY, USA')
        .images([
            builder.CardImage.create(session, 'https://my.hirehive.io/Public/ShowLogo/5153')
        ])
        .buttons([
            builder.CardAction.openUrl(session, 'https://my.hirehive.io/1r/jobs/27357/digital-art-director-new-york', 'Apply Now')
        ])   
    ]
}


//pplcard
function pplcard(session) {
    return [ 
        new builder.HeroCard(session)
        .title('Russell Durant')
        .subtitle('Northwood, United Kingdom')
        .text('Cosplayer and engineer. Not working on commissions at this time, unless you are a game developer. And your name is Hideo Kojima. ')
        .images([
            builder.CardImage.create(session, 'http://icon-icons.com/icons2/884/PNG/512/person_4_icon-icons.com_68900.png')
        ])
        .buttons([
            builder.CardAction.openUrl(session, 'https://emotio.typeform.com/to/D8gu3n', 'Browse Projects')
        ]),

        new builder.HeroCard(session)
        .title('Arika Ho')
        .subtitle('New York, NY, USA')
        .text('Founder of Lanacrafts Hong Kong. Happy to share my projects and techniques with other makers')
        .images([
            builder.CardImage.create(session, 'http://icon-icons.com/icons2/884/PNG/512/person_9_icon-icons.com_68901.png')
        ])
        .buttons([
            builder.CardAction.openUrl(session, 'https://my.hirehive.io/1r/jobs/27357/digital-art-director-new-york', 'Browse Projects')
        ])   
    ]
}

//greeting cards
function greetingcard(session) {
    return [
        new builder.HeroCard(session)
        .title('Find Projects')
        .subtitle('Explore projects logs similar to what you are working on, learn specific technical skills and insights from experiences of others!')
        .images([
            builder.CardImage.create(session, 'https://s13.postimg.org/4dpbpu87r/icons_proj3-01.jpg')
        ])
        .buttons([
            builder.CardAction.imBack(session, 'I need inspiration and ideas, can you help me find something?', 'Click here to start')
    
        ])
        ,

        new builder.HeroCard(session)
        .title('Find Creators [Backend In Progress 70%]')
        .subtitle('I can also connect you with creators/designers/makers who work on projects you are interested in!')
        .images([
            builder.CardImage.create(session, 'https://s16.postimg.org/sunkeafhx/icons_findppl-01.jpg')
        ])
        .buttons([
            builder.CardAction.imBack(session, 'Find Creators', 'Click here to start')
        
        ])
        ,

        new builder.HeroCard(session)
        .title('Get job/freelance opportunities [Backend In Progress 70%]')
        .subtitle('Describe to me the opportunity you are looking for! I will get you the perfect match.')
        .images([
            builder.CardImage.create(session, 'https://s2.postimg.org/v02k6gzvt/icons_findjob-01.jpg')
        ])
        .buttons([
            builder.CardAction.imBack(session, 'Get job/freelance opportunities', 'Click here to start')
        ])
        ,
        
        new builder.HeroCard(session)
        .title('Get events recommendation [Backend In Progress 70%]')
        .subtitle('Get recommendation of events/talks/courses/workshops/conferences according to your requirement')
        .images([
            builder.CardImage.create(session, 'https://s29.postimg.org/m9x4bloqf/icons_find_events-01.jpg')
        ])
        .buttons([
            builder.CardAction.imBack(session, 'Get events/workshop recommendation', 'Click here to start')
        
        ])
        ,
        
        new builder.HeroCard(session)
        .title('Get jargons definition')
        .subtitle('Just ask me a question like "What is xxx?" or "Define xxx"')
        .images([
            builder.CardImage.create(session, 'https://s10.postimg.org/h2cl1nqsp/icons_questions-01.jpg')
        ])
        ,

        new builder.HeroCard(session)
        .title('Get Projects recommendation')
        .subtitle('Check out the projects that we think you may be interested in! [80% done]')
        .images([
            builder.CardImage.create(session, 'https://s24.postimg.org/m28ug0nat/icons_proj-01.jpg')
        ])
        .buttons([
            builder.CardAction.imBack(session, 'project suggestions', 'Click here to start')
    
        ])

    ]
}
//opportunities update

function eventcard(session) {
    return [ 
        new builder.HeroCard(session)
        .title('Free Course: Visual Design and Motion Graphics')
        .subtitle('Application Deadline: 26/4/2017')
        .text('The last 3 free course of General Assembly Hong Kong, this one is especially designers and directors to be to learn about the concepts in visual design, which will help you to develop in many field......')
        .images([
            builder.CardImage.create(session, 'https://ga-shop-production-herokuapp-com.global.ssl.fastly.net/assets/images/logo_1200_by_627_1QIVL.jpg')
        ])
        .buttons([
            builder.CardAction.openUrl(session, 'https://generalassemb.ly/education/visual-design', 'Apply Now')
        ]),

        new builder.HeroCard(session)
        .title('The 21st ifva Awards')
        .subtitle('Deadline: 7/4/2017')
        .text('To discover and nurture the next currents for local creative industry of moving images....')
        .images([
            builder.CardImage.create(session, 'http://www.ifva.com/wp-content/uploads/21st_webbanner.jpg')
        ])
        .buttons([
            builder.CardAction.openUrl(session, 'http://www.ifva.com/?p=7620&lang=en', 'Apply Now')
        ])   
    ]
}




//                     //sample request
//                 request({
//                     url: "https://api.imgur.com/3/upload",
//                     method: "POST",
//                     image: '' 
//                 }, 
//                 function(err, res, body) {
//                     console.log(body);
//   // `body` is a js object if request was successful
//                 });
                //end of sample request