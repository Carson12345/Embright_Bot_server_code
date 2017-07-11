//load needed modules
var connect = require('connect');
var http = require('http');
var net = require('net');
var app = connect();
// require request-ip and register it as middleware
var requestIp = require('request-ip');
var builder = require('botbuilder');
var restify = require('restify');
var Store = require('./store');
var spellService = require('./spell-service');
var mssql = require('mssql');
var updatecount = 0;
var users = require('./users');
var plans = require('./plans');
const imageService = require('./image-service'),
    request = require('request').defaults({ encoding: null }),
    url = require('url'),
    validUrl = require('valid-url');

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
    appId: "469bcf4e-7852-4910-a2b7-3ece939377f5",
    appPassword: "8vX5j4na9Lo0rD9m1Sqsk5y"
});
var bot = new builder.UniversalBot(connector);
server.use(restify.bodyParser());
server.post('/api/messages', connector.listen());

// Maximum number of hero cards to be returned in the carousel. If this number is greater than 10, skype throws an exception.
const MAX_CARD_COUNT = 10;

const textapikey = "ce6e99c7adf64cd196462ffb0646cd09";


// You can provide your own model by specifing the 'LUIS_MODEL_URL' environment variable
// This Url can be obtained by uploading or creating your model from the LUIS portal: https://www.luis.ai/


const LuisModelUrl = 'https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/ca2bb7a0-576b-4982-96cb-ba95f3c7759b?subscription-key=46ae75eb0b4844c9a8e5b77a6ac1e1ad&timezoneOffset=0&verbose=true&q=';


// dialog with LUIS
var recognizer = new builder.LuisRecognizer(LuisModelUrl);


//Sends greeting message when the bot is first added to a conversation
bot.on('conversationUpdate', message => {
    if (message.membersAdded) {
        message.membersAdded.forEach(identity => {
            if (identity.id === message.address.bot.id) {
                const reply = new builder.Message()
                    .address(message.address)
                    .text('Welcome back! How can I help you?');
                    
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
                    .text('Hi, '+ session.message.address.user.name +'! How can I help you?')
                    .attachmentLayout(builder.AttachmentLayout.carousel)
                    .attachments(cards);
                session.send(reply);


                
  }
    ])

//Get Definition
    .matches('def', [
        function (session, args, next) 
            {
            var address = session.message.address;
            var query = builder.EntityRecognizer.findEntity(args.entities, 'defquery');
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
    .matches('check1', [
        function (session, args, next) 
            {
                var cards = eventcard(session);
                // attach the card to the reply message
                var reply = new builder.Message(session)
                    .text('😉 Sure! Consider the folowing:')
                    .attachmentLayout(builder.AttachmentLayout.carousel)
                    .attachments(cards);
                session.send(reply);
                session.send('😥😥 You are not on the right track! Try to spend less!'), session.message.text;
                
                
        }
  
])

//Getjobs
    .matches('risk', [
        function (session, args, next) 
        {
                session.send('Of course! 😉😉 Let me help you conduct a risk profiling.', session.message.text);
                builder.Prompts.text(session, 'Would you like to set aside part of your net worth for investments? Please note that there is a potential for loss of your capital when investing in any investment products?');

        },
         function (session, args, next) {
            builder.Prompts.text(session, 'How much of your income would you like to set aside for savings or investment in investment products? Please give me a percentage.');
        },
        function (session, results, next) {
            var learner_des = results.response;
            learner_des_ID = learner_des;
            session.send('The anlyzed result is as follows:', session.message.text);
            session.send('You are Type A Risk Averse ...', session.message.text);
                var cards = optioncard(session);
                // attach the card to the reply message
                var reply = new builder.Message(session)
                    .text('You can choose the investment products that match your risk profile')
                    .attachmentLayout(builder.AttachmentLayout.carousel)
                    .attachments(cards);
                session.send(reply);
                
        }        
])


//Check updates learn
    .matches('check2', [

    function (session, args, next) {
            builder.Prompts.text(session, '😉 Congrats! You met your saving target this month!');
            var cards = pplcard(session);
                // attach the card to the reply message
                var reply = new builder.Message(session)
                    .attachmentLayout(builder.AttachmentLayout.carousel)
                    .attachments(cards);
                session.send(reply);
        },
        function (session, results, next) {
            var learner_des = results.response;
            if (results.response == "See wealth growth") {

                var cards = savingcard(session);
                // attach the card to the reply message
                var reply = new builder.Message(session)
                    .attachmentLayout(builder.AttachmentLayout.carousel)
                    .attachments(cards);
                session.send(reply);

            } else if (results.response == "Advice on reducing expenditure") {

                var cards = breakcard(session);
                // attach the card to the reply message
                var reply = new builder.Message(session)
                    .attachmentLayout(builder.AttachmentLayout.carousel)
                    .attachments(cards);
                session.send(reply);
                var cards = jetsocard(session);
                // attach the card to the reply message
                var reply = new builder.Message(session)
                    .text('I have found out that you like to have Japanese food in Tsim Sha Tsui always, I suggest you to go to these restaurants that offer discounts to Hang Seng Bank users')
                    .attachmentLayout(builder.AttachmentLayout.carousel)
                    .attachments(cards);
                session.send(reply);

            } else if (results.response == "Advice on expanding income sources") {

                var cards = incomecard(session);
                // attach the card to the reply message
                var reply = new builder.Message(session)
                    .attachmentLayout(builder.AttachmentLayout.carousel)
                    .attachments(cards);
                session.send(reply);

            }
            learner_des_ID = learner_des;
            // session.send('Sure! I will monitor your expenditure and income and help you achieve your goal!'), session.message.text;


    }
])

//Check updates learn
.matches('checksad', [

    function (session, args, next) {
            builder.Prompts.text(session, '😥😥 Oh..you does not meet your saving goal this month');
            var cards = cantcard(session);
                // attach the card to the reply message
                var reply = new builder.Message(session)
                    .attachmentLayout(builder.AttachmentLayout.carousel)
                    .attachments(cards);
                session.send(reply);
        },
        function (session, results, next) {
            var learner_des = results.response;
            if (results.response == "See wealth growth") {

                var cards = savingcard(session);
                // attach the card to the reply message
                var reply = new builder.Message(session)
                    .attachmentLayout(builder.AttachmentLayout.carousel)
                    .attachments(cards);
                session.send(reply);

            } else if (results.response == "Advice on reducing expenditure") {

                var cards = breakcard(session);
                // attach the card to the reply message
                var reply = new builder.Message(session)
                    .attachmentLayout(builder.AttachmentLayout.carousel)
                    .attachments(cards);
                session.send(reply);
                var cards = jetsocard(session);
                // attach the card to the reply message
                var reply = new builder.Message(session)
                    .text('I have found out that you like to have Japanese food in Tsim Sha Tsui always, I suggest you to go to these restaurants that offer discounts to Hang Seng Bank users')
                    .attachmentLayout(builder.AttachmentLayout.carousel)
                    .attachments(cards);
                session.send(reply);

            } else if (results.response == "How can I increase income streams?") {

                var cards = incomecard(session);
                // attach the card to the reply message
                var reply = new builder.Message(session)
                    .attachmentLayout(builder.AttachmentLayout.carousel)
                    .attachments(cards);
                session.send(reply);

            }
            learner_des_ID = learner_des;
            


    }
])



.matches('startsaving', [
        function (session, args, next) 
            {

            builder.Prompts.text(session, 'Got it! How much is your saving goal per month?');
            },
            function (session, results, next) {
            var learner_des = results.response;
            learner_des_ID = learner_des
            
            builder.Prompts.text(session, 'That is great!👍 May I know what are the main purposes of the saving?');
        },
         function (session, results,next) {
            var userid = session.message.address.user.id;
            var plan_chosen = results.response;
            plan_chosen_ID = plan_chosen;
            session.send('Sure! I will monitor your expenditure and income and help you achieve your goal!'), session.message.text;
            //send data to database for learning - send plan title chosen, search request, plan id
         
         }
        
    ])






    .onDefault(
        


        (session) => {
        try {
            console.log(session.message.attachments[0]['contentUrl']);
            session.send('Your file has been hosted temporalily! Please use the following url', session.message.text);
            session.send(session.message.attachments[0]['contentUrl'], session.message.text);
            
        }
        catch(error) {
                var cards = greetingcard(session);
                // attach the card to the reply message
                var reply = new builder.Message(session)
                    .text('I understand but so far I can only provide the following functions. How can I help you?😉')
                    .attachmentLayout(builder.AttachmentLayout.carousel)
                    .attachments(cards);
                session.send(reply);
        }

    })
);

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
        .subtitle(planobj[key]['PlanDetails'])

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



//pplcard
function jetsocard(session) {
    return [ 
        new builder.HeroCard(session)
        .title('Genki Sushi')
        .subtitle('The Mira Hong Kon, 118 Nathan Rd, Tsim Sha Tsui')
        .text('25% off for Hang Seng Bank Credit Card')
        .images([
            builder.CardImage.create(session, 'https://s7.postimg.org/5ggrvu44r/genki-01.png')
        ])
        .buttons([
            builder.CardAction.imBack(session, 'Details', 'Details')
    
        ])
        ,

        new builder.HeroCard(session)
        .title('Sushi Shikon')
        .subtitle('The Peninsula Hong Kong, 28/F Salisbury Rd, Tsim Sha Tsui ')
        .text('15% off for Hang Seng Bank Credit Card')
        .images([
            builder.CardImage.create(session, 'https://www.hangseng.com/cms/emkt/pmo/grp04/p38/chi/images/logo/shikon.jpg')
        ])
        // .buttons([
        //     builder.CardAction.openUrl(session, 'http://www.ifva.com/?p=7620&lang=en', 'Apply Now')
        // ])
        .buttons([
            builder.CardAction.imBack(session, 'Details', 'Details')
    
        ])
        ,

        new builder.HeroCard(session)
        .title('温野菜')
        .subtitle('29+30F, 1 Peking Rd, Tsim Sha Tsui')
        .text('20% off for Hang Seng Bank Credit Card')
        .buttons([
            builder.CardAction.imBack(session, 'Details', 'Details')
    
        ])
        .images([
            builder.CardImage.create(session, 'https://www.hangseng.com/cms/emkt/pmo/grp04/p38/chi/images/logo/ony.jpg')
        ])
        // .buttons([
        //     builder.CardAction.openUrl(session, 'http://www.ifva.com/?p=7620&lang=en', 'Apply Now')
        // ])
    ]
}

//pplcard
function pplcard(session) {
    return [ 
        new builder.HeroCard(session)
        .title('Net change in account balance: $2325.7 ')
        .subtitle('You saved $2325.7 this month!')
        .text('Congrats! You met the saving target for this month and saved $2325.7! Click the following button to see the growth history and the projected growth trend!')
        .images([
            builder.CardImage.create(session, 'https://s11.postimg.org/ofc1bi7o3/goal-01.png')
        ])
        .buttons([
            builder.CardAction.imBack(session, 'See wealth growth', 'See wealth growth')
    
        ])
        ,

        new builder.HeroCard(session)
        .title('Your Total Expenditure this month: ')
        .subtitle('This report is based on the data collectedfrom 22/5 - 26/5')
        .text('Click "Expenditure breakdown" to see what did you spend your money on this month!')
        .images([
            builder.CardImage.create(session, 'https://s4.postimg.org/tidfqpfy5/pay-01.png')
        ])
        // .buttons([
        //     builder.CardAction.openUrl(session, 'http://www.ifva.com/?p=7620&lang=en', 'Apply Now')
        // ])
        .buttons([
            builder.CardAction.imBack(session, 'Advice on reducing expenditure', 'Advice on reducing expenditure')
    
        ])
        ,

        new builder.HeroCard(session)
        .title('Your Total Income this month: ')
        .subtitle('This report is based on the data collectedfrom 22/5 - 26/5')
        .text('Click "Income breakdown" to see what did you spend your money on this month!')
        .buttons([
            builder.CardAction.imBack(session, 'Advice on expanding income sources', 'Advice on expanding income sources')
    
        ])
        .images([
            builder.CardImage.create(session, 'https://s29.postimg.org/6s0r7rd6v/save-01.png')
        ])
        // .buttons([
        //     builder.CardAction.openUrl(session, 'http://www.ifva.com/?p=7620&lang=en', 'Apply Now')
        // ])
    ]
}

//cant save card
function cantcard(session) {
    return [ 
        new builder.ThumbnailCard(session)
        .title('Net change in account balance: ')
        .subtitle('Your account loses $500 this month!')
        .text('I found out that you are having rather high expenditure this month! I would suggest you to check out the wealth management from HKMA. If you need to borrow money for emergency, please click out the loans info below')
        // // .images([
        // //     builder.CardImage.create(session, 'https://ga-shop-production-herokuapp-com.global.ssl.fastly.net/assets/images/logo_1200_by_627_1QIVL.jpg')
        // // ])
        .buttons([
            builder.CardAction.imBack(session, 'See wealth growth', 'See wealth growth')
        ,
            builder.CardAction.openUrl(session, './chart.html', 'Saving Advice from HKMA')
        ,
            builder.CardAction.openUrl(session, 'https://bank.hangseng.com/1/2/chi/personal/loans/instalment-loan?&cid=personal-loans:ploan2017:sem:googlesem:runofsite&mkwid=soZGazmvZ_187333725767_%252Bhang%2520%252Bseng%2520%252Bloan_b_c', 'Hang Seng Personal Loan/Credit Card Loan')
        ])
        ,

        new builder.HeroCard(session)
        .title('Your Total Expenditure this month: ')
        .subtitle('This report is based on the data collectedfrom 22/5 - 26/5')
        .text('Click "Expenditure breakdown" to see what did you spend your money on this month!')
        // .images([
        //     builder.CardImage.create(session, 'https://camo.githubusercontent.com/22c2fafa60804cb2bc3f60ff8afe6d5262da3b25/68747470733a2f2f73332e616d617a6f6e6177732e636f6d2f7a654d6972636f2f6769746875622f73776966742d6c696e6563686172742f30312e706e67')
        // ])
        // .buttons([
        //     builder.CardAction.openUrl(session, 'http://www.ifva.com/?p=7620&lang=en', 'Apply Now')
        // ])
        .buttons([
            builder.CardAction.imBack(session, 'Advice on reducing expenditure', 'Advice on reducing expenditure')
    
        ])
        ,

        new builder.HeroCard(session)
        .title('Your Total Income this month: ')
        .subtitle('This report is based on the data collectedfrom 22/5 - 26/5')
        .text('Click "Income breakdown" to see what did you spend your money on this month!')
        .buttons([
            builder.CardAction.imBack(session, 'Advice on expanding income sources', 'Advice on expanding income sources')
    
        ])

    ]
}

//greeting cards
function greetingcard(session) {
    return [
        new builder.HeroCard(session)
        .title('Most updated saving advice 💡 ')
        .subtitle('Check out if you are spending at the right pattern!')
        // .images([
        //     builder.CardImage.create(session, 'https://s13.postimg.org/4dpbpu87r/icons_proj3-01.jpg')
        // ])
        .buttons([
            builder.CardAction.imBack(session, 'Am I on the right track?', 'Am I on the right track?')
    
        ])
        ,

        new builder.HeroCard(session)
        .title('Check latest monthly report 📊 ')
        .subtitle('Set new saving goal or edit current goal')
        // .images([
        //     builder.CardImage.create(session, 'https://s16.postimg.org/sunkeafhx/icons_findppl-01.jpg')
        // ])
        .buttons([
            builder.CardAction.imBack(session, 'Check monthly report', 'Check monthly report')
        
        ]),

        new builder.HeroCard(session)
        .title('Set Saving Goal 💲')
        .subtitle('Set new saving goal or edit current goal')
        // .images([
        //     builder.CardImage.create(session, 'https://s16.postimg.org/sunkeafhx/icons_findppl-01.jpg')
        // ])
        .buttons([
            builder.CardAction.imBack(session, 'Edit saving goal', 'Edit saving goal')
        
        ])
        


    ]
}
//opportunities update

function eventcard(session) {
    return [ 
        new builder.HeroCard(session)
        .title('Predicted Month-end Net Balance: +$570 ')
        .subtitle('The latest estimate of net change in your bank balance at the end of this month')
        .text('Hi there! The predicted net change is +$570, which is lower than your saving target! you better spend less in the rest of the days this month!')
        .images([
            builder.CardImage.create(session, 'https://s29.postimg.org/cmv6gldl3/trend-01.png')
        ])
        .buttons([
            builder.CardAction.imBack(session, 'Show me the prediction graph', 'See prediction graph')
    
        ])
        ,

        new builder.HeroCard(session)
        .title('Your Expense this week: $930 ')
        .subtitle('This report is based on the data collectedfrom 22/5 - 26/5')
        .text('Week-over-Week Expense growth: +3.21% ')
        .images([
            builder.CardImage.create(session, 'https://s4.postimg.org/tidfqpfy5/pay-01.png')
        ])

        .buttons([
            builder.CardAction.imBack(session, 'Show me the expense graph', 'See graph')
    
        ])
        ,

        new builder.HeroCard(session)
        .title('Your Income this week: $50')
        .subtitle('This report is based on the data collectedfrom 22/5 - 26/5')
        .text('Week-over-Week Income growth: -0.37%')
        .buttons([
            builder.CardAction.imBack(session, 'Show me the income graph', 'See graph')
    
        ])
        .images([
            builder.CardImage.create(session, 'https://s29.postimg.org/6s0r7rd6v/save-01.png')
        ])

    ]
}


//investment update

function investcard(session) {
    return [ 
        new builder.HeroCard(session)
        .title('The amount of money that can be used to invest')
        .subtitle('We analysed your expenditure pattern')
        .text('We analysed your expenditure pattern, we found out that actually you have around $10,000 unused funds in your account. If you would like to explore available investment options, please click to start a risk assessment.')
        .buttons([
            builder.CardAction.imBack(session, 'Start Risk Assessment', 'Start Risk Assessment')
        ])

    ]
}

//investment options

function optioncard(session) {
    return [ 
        new builder.HeroCard(session)
        .title('Stock')
        .subtitle('Stock Investment is suitable for people with score > X in the risk assessment')
        .text('Stock Investment is suitable for people with score > X in the risk assessment')
        .buttons([
            builder.CardAction.imBack(session, 'Place order - Stocks', 'Place order')
        ]),


        new builder.HeroCard(session)
        .title('Bond')
        .subtitle('Bond Investment is suitable for people with score > X in the risk assessment')
        .text('Bond Investment is suitable for people with score > X in the risk assessment')
        .buttons([
            builder.CardAction.imBack(session, 'Place order - Bonds', 'Place order')
        ]),

        new builder.HeroCard(session)
        .title('Time Deposit')
        .subtitle('Time Deposit Investment is suitable for people with score > X in the risk assessment')
        .text('Time Deposit Investment is suitable for people with score > X in the risk assessment')
        .buttons([
            builder.CardAction.imBack(session, 'Place order - Time Deposits', 'Place order')
        ])

        ,
        new builder.HeroCard(session)
        .title('Funds')
        .subtitle('Funds Investment is suitable for people with score > X in the risk assessment')
        .text('Funds Investment is suitable for people with score > X in the risk assessment')
        .buttons([
            builder.CardAction.imBack(session, 'Place order - Funds', 'Place order')
        ])

    ]
}

//expenditure update

function savingcard(session) {
    return [ 
        new builder.HeroCard(session)
        .title('Wealth growth trend')
        .subtitle('You did a great job!')
        .text('Above is how much your wealth have growth in the past one year')
    
        // // .images([
        // //     builder.CardImage.create(session, 'https://ga-shop-production-herokuapp-com.global.ssl.fastly.net/assets/images/logo_1200_by_627_1QIVL.jpg')
        // // ])
    ]
}
//expenditure update

function breakcard(session) {
    return [ 
        new builder.HeroCard(session)
        .title('Expenditure Breakdown')
        .subtitle('Above is how much you have spent in each category')
        .text('Below how much you have spent in each category')
        .images([
            builder.CardImage.create(session, 'https://s12.postimg.org/hsk8ackgt/piechart.png')
        ])
    ]
}

//income update

function incomecard(session) {
    return [ 
        new builder.HeroCard(session)
        .title('Income Breakdown')
        .subtitle('You can spend some of your money in the account on investment')
        .text('I have identified that there are around $10,000 unused funds. If you want to expand our income sources, I can give you information of the available options!')
        .buttons([
            builder.CardAction.imBack(session, 'How can I increase income streams?', 'How can I increase income streams?')
        ])
        .images([
            builder.CardImage.create(session, 'https://s16.postimg.org/3lv8taixh/Untitled-3-01.png')
        ])
    ]
}






