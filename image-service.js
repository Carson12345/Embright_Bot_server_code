// The exported functions in this module makes a call to Bing Image Search API returns similar products description if found.
// Note: you can do more functionalities like recognizing entities. For more info checkout the API reference:
// https://msdn.microsoft.com/en-us/library/dn760791.aspx
const request = require('request').defaults({ encoding: null });

const BING_API_URL = 'https://api.cognitive.microsoft.com/bing/v5.0/images/search?modulesRequested=SimilarProducts&mkt=en-us&form=BCSPRD';


const BING_SEARCH_API_KEY = 'e6f4256f03e34713bb3f9296954fe3cb';
// const BING_SEARCH_API_KEY = 'ee4e28574f514ce7b687236b01a07432';
// const BING_SEARCH_API_KEY = process.env.BING_SEARCH_API_KEY;


/** 
 *  Gets the similar products of the image from an image stream
 * @param {stream} stream The stream to an image.
 * @return {Promise} Promise with visuallySimilarProducts array if succeeded, error otherwise
 */
exports.getSimilarProductsFromStream = stream => {
    return new Promise(
        (resolve, reject) => {       
            const requestData = {
                url: BING_API_URL,
                encoding: 'binary',
                formData: {
                    file: stream
                },
                headers: {
                    'Ocp-Apim-Subscription-Key': BING_SEARCH_API_KEY
                }
            };

            request.post(requestData, (error, response, body) => {
                if (error) {
                    reject(error);
                }
                else if (response.statusCode !== 200) {
                    reject(body);
                }
                else {
                    resolve(JSON.parse(body).visuallySimilarProducts);
                    console.log("on999999");
                    console.log("on999999");
                    console.log(JSON.parse(body));
                    console.log("on999999");
                    console.log("on999999");
                }
            });
        }
    );
};

/** 
 * Gets the similar products of the image from an image URL
 * @param {string} url The URL to an image.
 * @return {Promise} Promise with visuallySimilarProducts array if succeeded, error otherwise
 */
exports.getSimilarProductsFromUrl = url => {
    return new Promise(
        (resolve, reject) => {
            const requestData = {
                url: BING_API_URL + '&imgurl=' + url,
                headers: {
                    'Ocp-Apim-Subscription-Key': BING_SEARCH_API_KEY
                },
                json: true
            };

            request.get(requestData, (error, response, body) => {
                if (error) {
                    reject(error);
                }
                else if (response.statusCode !== 200) {
                    reject(body);
                }
                else {
                    resolve(body.visuallySimilarProducts);
                    console.log("on999999");
                    console.log("on999999");
                    console.log(JSON.parse(body));
                    console.log("on999999");
                    console.log("on999999");
                }
            });
        }
    );
};



/** 
 *  Gets the similar products of the image from an image stream
 * @param {stream} stream The stream to an image.
 * @return {Promise} Promise with visuallySimilarProducts array if succeeded, error otherwise
 */
exports.getSimilarProductsFromtext = seaquery => {
    return new Promise(
        (resolve, reject) => {       
            const requestData = {
                url: 'https://api.cognitive.microsoft.com/bing/v5.0/images/search?q='+ seaquery +' site:www.amazon.com&count=10&offset=0&mkt=en-us&safeSearch=Moderate',
                encoding: 'binary',
                headers: {
                    'Ocp-Apim-Subscription-Key': BING_SEARCH_API_KEY
                }
            };

            request.post(requestData, (error, response, body) => {
                if (error) {
                    reject(error);
                }
                else if (response.statusCode !== 200) {
                    reject(body);
                }
                else {
                    resolve(JSON.parse(body).value);
                    console.log("on999999");
                    console.log("on999999");
                    console.log(JSON.parse(body));
                    console.log("on999999");
                    console.log("on999999");
                }
            });
        }
    );
};