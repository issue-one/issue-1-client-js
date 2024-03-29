'use strict';
import {attachAuthTokenToHeader, attachImageToRequest, makeRequest} from "./utilites.js";
import {generateQueryParams} from "./utilites";

export {
    addUser,
    deleteUser,
    getUser,
    getUsers,
    searchUsers,
    updateUser,
    addPostBookmark,
    getUserBookmarks,
    deleteBookmark,
    addProfilePicture,
    removeProfilePicture,
    NewUserServiceClient
};

/**
 * @typedef {object} User
 * Represents standard user entity of issue#1.
 *
 * @property {string} username
 * @property {string} [email]
 * @property {string} [password]
 * @property {string} [firstName]
 * @property {string} [middleName]
 * @property {string} [lastName]
 * @property {string} creationTime
 * @property {string} [bio]
 * @property {string} [pictureURL]
 *
 */

function NewUserServiceClient(baseURL) {
    let client = {
        baseURL,
        /**
         * Get the the user under the given username.
         * @see {@link getUser}
         */
        async getUser(username, token) {
            return getUser(client.baseURL, username, token);
        },
        /**
         * Sends a a request to create a user based on the passed in object.
         */
        async addUser(user) {
            return addUser(client.baseURL, user);
        },
        /**
         * Search for users according to the specified pattern.
         */
        async searchUsers(pattern = "", {limit, offset, sortingOrder, sortParameter} = {}) {
            return searchUsers(client.baseURL, pattern, {limit, offset, sortingOrder, sortParameter});
        },
        /**
         * Get all users using the specified pagination.
         */
        async getUsers({limit, offset, sortingOrder, sortParameter} = {}) {
            return getUsers(client.baseURL, {limit, offset, sortingOrder, sortParameter});
        },
        /**
         * Update the user under the given username according to the values on the given object.
         */
        async updateUser(username, user, authToken) {
            return updateUser(client.baseURL, username, user, authToken);
        },
        /**
         * Sends a a request to remove the user under the given username.
         */
        async deleteUser(username, authToken) {
            return deleteUser(client.baseURL, username, authToken);
        },
        /***
         * Adds the post under the given ID to the bookmark list of the user under the given username.
         */
        async addPostBookmark(username, postID, authToken) {
            return addPostBookmark(client.baseURL, username, postID, authToken);
        },
        /***
         * Retrieves the bookmarks of the specified user.
         */
        async getUserBookmarks(baseURL, username, authToken) {
            return getUserBookmarks(client.baseURL, username, authToken);
        },
        /**
         * Removes the given postID from the user's bookmark list.
         */
        async deleteBookmark(baseURL, username, postID, authToken) {
            return deleteBookmark(client.baseURL, username, postID, authToken);
        },
        /**
         * Sets the provided image as the users profile picture.
         */
        async addProfilePicture(username, authToken, imageData, imageName = 'client-js.jpg') {
            return addProfilePicture(client.baseURL, username, authToken, imageData, imageName);
        },
        /**
         * Removes the user's profile picture.
         */
        async removeProfilePicture(username, authToken) {
            return removeProfilePicture(client.baseURL, username, authToken);
        },
    };
    return client;
}

/**
 * Get the the user under the given username.
 * @async
 * @param {string} baseURL
 * @param {string} username
 * @param {string} [authToken] - optional param. Will only return email and other confidential
 * data if correct token's provided for given user.
 * @returns {Promise<User | jSend>} user
 */
async function getUser(baseURL, username, authToken = "") {
    let response = (await makeRequest(
        `${baseURL}/users/${username}`,
        {headers: attachAuthTokenToHeader(authToken)}));
    return response.data;
}

/**
 * Sends a a request to create a user based on the passed in object.
 * @async
 * @param {string} baseURL
 * @param {User} user user object
 * @returns {Promise<User | jSendFailData>} user
 */
async function addUser(baseURL, user) {
    return (await makeRequest(
        `${baseURL}/users`,
        {method: 'post', data: user}))
        .data;
}

/**
 * Sends a a request to remove the user under the given username.
 * @async
 * @param {string} baseURL
 * @param {string} username
 * @param {string} authToken
 * @returns {Promise<jSend>}
 */
async function deleteUser(baseURL, username, authToken) {
    return (await makeRequest(
        `${baseURL}/users/${username}`,
        {
            method: 'delete',
            headers: attachAuthTokenToHeader(authToken)
        }));
}

/**
 * Update the user under the given username according to the values on the given object.
 * @param {string} baseURL
 * @param {string} username
 * @param {User} user - new values to be updated
 * @param {string} authToken
 * @returns {Promise<User>}
 */
async function updateUser(baseURL, username, user, authToken) {
    return (await makeRequest(
        `${baseURL}/users/${username}`,
        {
            method: 'put',
            headers: attachAuthTokenToHeader(authToken),
            data: user
        }))
        .data;
}

/**
 * Search for users according to the specified pattern.
 *
 * @param {string} baseURL
 * @param {string} pattern
 * @param {Object} [requestConfig]
 * @param {Number} [requestConfig.limit=25]
 * @param {Number} [requestConfig.offset=0]
 * @param {string} [requestConfig.sortingOrder] - either 'asc' or 'dsc'
 * @param {string} [requestConfig.sortParameter] - 'creation_time', 'username', 'first-name' or 'last-name'
 * @returns {Promise<Array<User>>}
 */
async function searchUsers(baseURL, pattern = "", {limit, offset, sortingOrder, sortParameter} = {}) {
    let response = await makeRequest(
        `${baseURL}/users`,
        {
            method: 'get',
            params: generateQueryParams({pattern, limit, offset, sortingOrder, sortParameter}),
        });
    return response.data;
}

/**
 * Get all users using the specified pagination.
 *
 * @param {string} baseURL
 * @param {Object} [requestConfig]
 * @param {Number} [requestConfig.limit=25]
 * @param {Number} [requestConfig.offset=0]
 * @param {string} [requestConfig.sortingOrder] - either 'asc' or 'dsc'
 * @param {string} [requestConfig.sortParameter] - 'creation_time', 'username', 'first-name' or 'last-name'
 * @returns {Promise<Array<User>>}
 */
async function getUsers(baseURL, {limit, offset, sortingOrder, sortParameter} = {}) {
    return searchUsers(baseURL, "", {limit, offset, sortingOrder, sortParameter})
}

/**
 * Adds the post under the given ID to the bookmark list of the user under the given username.
 * @param {string} baseURL
 * @param {string} username
 * @param {number} postID
 * @param {string} authToken
 */
async function addPostBookmark(baseURL, username, postID, authToken) {
    return (await makeRequest(
        `${baseURL}/users/${username}/bookmarks/${postID}`,
        {
            method: 'put',
            headers: attachAuthTokenToHeader(authToken),
        }));
}

/**
 * Retrieves the bookmarks of the specified user.
 * @param {string} baseURL
 * @param {string} username
 * @param {string} authToken
 * @return {{bookmarkedTime: Post}} - bookmark-time:post map
 */
async function getUserBookmarks(baseURL, username, authToken) {
    return (await makeRequest(
        `${baseURL}/users/${username}/bookmarks`,
        {
            method: 'get',
            headers: attachAuthTokenToHeader(authToken),
        }))
        .data;
}


/**
 * Removes the given postID from the user's bookmark list.
 * @param {string} baseURL
 * @param {string} username
 * @param {number} postID - id of the post
 * @param {string} authToken
 */
async function deleteBookmark(baseURL, username, postID, authToken) {
    return (await makeRequest(
        `${baseURL}/users/${username}/bookmarks/${postID}`,
        {
            method: 'delete',
            headers: attachAuthTokenToHeader(authToken),
        }));
}

/**
 * Sets the provided image as the users profile picture.
 * @param {string} baseURL
 * @param {string} username
 * @param {Blob | FormData | Buffer | Readable} imageData
 * @param {string} authToken
 * @param {string} imageName - name under which the image will be saved on the server
 * @return {string} - link to the image on the server
 */
async function addProfilePicture(baseURL,
                                 username, authToken,
                                 imageData, imageName = 'client-js.jpg') {
    return (await makeRequest(
        `${baseURL}/users/${username}/picture`,
        {
            method: 'put',
            ...await attachImageToRequest(
                imageData,
                {
                    headers: attachAuthTokenToHeader(authToken),
                    imageName
                }
            ),
        }))
        .data;
}


/**
 * Removes the user's profile picture.
 * @param {string} baseURL
 * @param {string} username
 * @param {string} authToken
 */
async function removeProfilePicture(baseURL, username, authToken) {
    return (await makeRequest(
        `${baseURL}/users/${username}/picture`,
        {
            method: 'delete',
            headers: attachAuthTokenToHeader(authToken),
        }));
}
