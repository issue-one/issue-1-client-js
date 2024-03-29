'use strict';

import axios from 'axios';
import {isNode} from "browser-or-node";
import FormDataNode from "form-data";
import {Readable} from "stream";


const CONNECTION_ERROR = Error("issue1.REST.client: connection could not be made with issue1 REST");

export {
    makeRequest,
    attachAuthTokenToHeader,
    attachImageToRequest,
    generateQueryParams,
    calculateLimitOffset,
    CONNECTION_ERROR
};


/**
 * Add the given auth token as an authorization header.
 * @param {string} authToken
 * @param {object} headers - A header object. If provided, the token will be attached to this object
 * and it's this object that wil be returned.
 */
function attachAuthTokenToHeader(authToken, headers = {}) {
    if (!authToken) {
        return undefined;
    }
        // check if there's whitespace in authToken.
        // axios throws DOMExceptions for some issue instances in parsing 
    // headers. 
    else if (authToken.split(/\s/).length > 1) {
        throw Error("Invalid authToken");
    }
    headers.Authorization = "Bearer " + authToken;
    return headers;
}

/**
 * Helper method for generating query params for pagination and searching.
 * @param {string} [pattern]
 * @param {number} [limit]
 * @param {number} [offset]
 * @param {string} [sortingOrder]
 * @param {string} [sortParameter]
 * @param {boolean} [onlyIds]
 * @return {{limit:number, offset:number, pattern:string: sort:string}}
 */
function generateQueryParams({pattern, limit, offset, sortingOrder, sortParameter, onlyIds} = {}) {
    let params = {};
    if (limit || offset) {
        params = {
            limit,
            offset,
            ...params,
        }
    }
    if (sortParameter) {
        params.sort = `${sortParameter}`;
        if (sortingOrder) {
            params.sort += `_${sortingOrder}`;
        }
    }
    if (pattern) {
        params.pattern = pattern;
    }
    if (onlyIds) {
        params.onlyPKeys = true;
    }
    return params;
}

/**
 * Attach the given image to the request.
 * Usage: object spread operator on returned value into the makeRequest config object.
 *
 *
 * @param {Blob | FormData | Buffer | Readable} imageData - image data for the multipart request, will be put under key 'image'
 * @param {Object} [config]
 * @param {Object} [config.headers] - other headers to append to the request
 * @param {Object | undefined} [config.otherData] - other data for the multipart request, will be put under key 'json'
 * @param {string} [config.imageName] - name under which the image will be saved on the server
 */
async function attachImageToRequest(imageData, {headers = {}, otherData, imageName = 'client-js.jpg'}) {
    function appendDataToFormData(formData, data, knownLength) {
        formData.append("image", data, {
            knownLength: knownLength,
            contentType: 'image/*',
            filename: imageName,
            header: {
                'Content-Transfer-Encoding': 'binary'
            }
        });
    }

    // for node environment
    if (isNode) {
        let formData = new FormDataNode();

        if (otherData) {
            formData.append("JSON", JSON.stringify(otherData));
        }
        if (imageData instanceof Buffer) {
            appendDataToFormData(formData, imageData, imageData.length);
        } else if (imageData instanceof Readable) {
            //
            let buffer = Buffer.alloc(0);
            // wait till image data has been completely transferred to buffer 
            await new Promise(resolve => {
                imageData.on('data', chunk => {
                    buffer = Buffer.concat([buffer, chunk], chunk.length + buffer.length);
                });
                imageData.on('end', () => resolve());
            });
            if (buffer.length === 0) {
                throw new Error("Provided Readable stream has no data.");
            }
            appendDataToFormData(formData, buffer, buffer.length);
        } else {
            throw new Error("Only instances of Buffer or ReadStream supported for image data in node environment.");
        }
        return {
            data: formData.getBuffer(),
            headers: {
                ...headers,
                ...formData.getHeaders()
            },
        }
    }
    // for browser environment
    if (imageData instanceof FormData) {
        if (!imageData.has('image')) {
            throw new Error(`Instance of FormData provided as image data \ 
                            but no item present under the key 'image'`);
        }
        return {
            data: imageData,
            headers,
        }
    } else {
        let formData = new FormData();
        if (imageData instanceof Blob) {
            appendDataToFormData(formData, imageData, imageData.size);
        } else {
            throw new Error("Only instances of FormData, Blob(File) supported for image data in browser environment.");
        }
        return {
            data: formData,
            headers,
        };

    }
}

/**
 * jSend object. Type used by issue-1-rest for responses.
 * @typedef {object} jSend
 * @property {string} status
 * @property {any | undefined} data
 * @property {string | undefined} message
 */

/**
 * type of {@link jSend} object used for failed requests.
 * @typedef {object} jSendFail
 * @property {string} status
 * @property {jSendFailData} data
 * @property {string | undefined} message
 */

/**
 * jSendFailData object. Type used in the {@link jSendFail#data} property if the server response was a fail.
 * @typedef jSendFailData
 * @property {string} errorReason
 * @property {string} errorMessage
 */

/**
 * Uses {@link axios} to make a request according to the given config.
 * @async
 * @param {string} URL - url of the resource.
 * @param {object} [requestConfig]
 * @param {string} [requestConfig.method = get]
 * @param {string} [requestConfig.responseType = json]
 * @param {object} [requestConfig.headers] - request headers
 * @param {object} [requestConfig.data]
 * @param {object} [requestConfig.params]
 * @param {Array<function>} [requestConfig.transformRequest]
 * @returns {Promise<object | jSend | any>} successful response
 * @throws {object | Error | jSendFail} when request fails
 */
async function makeRequest(URL, {method = 'get', responseType = 'json', headers, data, params, transformRequest} = {}) {
    let config = {
        method,
        headers: {
            ...headers,
        },
        url: URL,
        responseType,
        data,
        params,
        transformRequest,
        // mode: "cors",
        // body: JSON.stringify(data),
    };
    /*if(data){
        console.log(data.toString());
    }*/
    try {
        let response = await axios(URL, config);
        /* console.log('response: ');
         console.log(response);*/
        if (response.data.status === "fail") {
            // if it's a failure, throw it as an error
            throw response.data;
        }
        return response.data;
    } catch (error) {
        // console.log(error);
        // if error is jSendFail thrown at line 80
        if (error.status === "fail") {
            // rethrow it
            throw error;
        }

        if (error instanceof DOMException) {
            if (error.name === "SyntaxError") {
                throw new Error("Invalid input: unable to parse input.");
            } else {
                let newError = Error("unexpected exception: DOMException thrown by axios. Attached to this error object under property {domException}");
                newError.domException = error;
                throw newError;
            }
        }

        let description = '';
        let response;
        // if there was a response
        // i.e. contanct was made with server
        if (!!error.response) {
            description += 'there was a response; ';

            // if there's a jSend object on response
            if (!!error.response.data) {
                if (!!error.response.data.status) {
                    // throw the jSend
                    let jSend = error.response.data;
                    jSend.errorCode = error.response.status;
                    throw jSend;
                }
            }
            // extract response data
            response = {
                status: error.response.status,
                statusText: error.response.statusText,
                headers: error.response.headers,
                data: error.response.data,
            };
            // TODO: logging
        }
            // if there was a request
        // i.e if request was valid
        else if (!!error.request) {
            // The request was made but no response was received
            // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
            // http.ClientRequest in node.js

            description += 'no response was received; ';

            // check if it's a connection error
            if (error.code === 'ENOTFOUND') {
                throw CONNECTION_ERROR;
            }
        } else {
            // Something happened in setting up the request that triggered an Error
            description += 'setting up request failed; ';
        }

        // selectively pick out some of the information from the
        // axios error object
        let {
            message, name, nativeDescription: axiosDescription, number, code,
            config: {
                url, timeout,
                headers: requestHeaders,
                data: requestData,
                method: requestMethod,
                responseType: expectedType,
            },
        } = error.toJSON();

        // if there's a description on the axios error
        // add that to our custom description
        if (!!axiosDescription) {
            description += axiosDescription;
        }

        // throw a custom error
        throw {
            message,
            name,
            description,
            response,
            request: {
                url,
                method: requestMethod,
                headers: requestHeaders,
                data: requestData,
                timeout,
                responseType: expectedType,
            },
            number,
            code,
        };
    }
}

/**
 * Calculate limit/offset from page and perPage values.
 * @param {Number} page
 * @param {Number} perPage
 * @returns {object} - {limit: Number, offset: Number}
 */
function calculateLimitOffset(page = 1, perPage = 25) {
    return {limit: perPage, offset: (page - 1) * perPage}
}
