var _ = require('lodash');
const transformer = require('../../lib/index');
const path = require('path');

const options = {
    dest: path.join(__dirname, './output'),
    src: path.join(__dirname, './input'),
    template: path.join(__dirname, '../template/')
}

const expectedObject = {
    "swagger": "2.0",
    "info": {
        "title": "apidoc-swagger",
        "version": "0.2.3",
        "description": "Convert api doc json to swagger json"
    },
    "paths": {
        "/user/id": {
            "get": {
                "tags": ["User"],
                "summary": "Request User information",
                "description": "Request User information",
                "consumes": ["application/json"],
                "produces": ["application/json"],
                "parameters": [{
                    "name": "id",
                    "in": "query",
                    "required": true,
                    "type": "number",
                    "description": "Users unique ID."
                }],
                "responses": {
                    "200": {
                        "description": "Success",
                        "schema": { "$ref": "#/definitions/GetUserResult" }
                    }
                }
            }
        }
    },
    "definitions": {
        "GetUserResult": {
            "properties": {
                "firstname": {
                    "type": "string",
                    "description": "Firstname of the User."
                },
                "lastname": {
                    "type": "string",
                    "description": "Lastname of the User."
                }
            },
            "required": [
                "firstname",
                "lastname"
            ]
        }
    }
}

test('simple file should be transformed correctly', () => {
    var transformedObj = transformer.createApidocSwagger(options);
    expect(JSON.parse(transformedObj.swaggerData)).toEqual(expectedObject);
});