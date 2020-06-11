
function addApiGatewayPlugin(path, params, httpMethodType) {
    var basePlugin = {
        uri: "http://${stageVariables.lb_dns}" + path,
        responses: {
          default: {
            statusCode: "200"
          }
        },
        passthroughBehavior: "when_no_match",
        connectionType: "VPC_LINK",
        connectionId: "${stageVariables.vpc_link_id}",
        httpMethod: httpMethodType.toUpperCase(),
        type: "http_proxy"
    }

    for(var param of params) {
        if(param.in === 'path' || param.in == 'query') {
            if(!basePlugin.requestParameters) {
                basePlugin.requestParameters = {}
            }
            if(param.in == 'path') {
                basePlugin.requestParameters[`integration.request.path.${param.name}`] = `method.request.path.${param.name}`
            } else {
                basePlugin.requestParameters[`integration.request.querystring.${param.name}`] = `method.request.querystring.${param.name}`
            }
        }
        if(httpMethodType === 'get') {
            if(!basePlugin.cacheKeyParameters) {
                basePlugin.cacheKeyParameters = []
            }
            var cacheKey = param.in === 'path' ? `method.request.path.${param.name}` : `method.request.querystring.${param.name}`
            basePlugin.cacheKeyParameters.push(cacheKey)
        }
    }
    return basePlugin
}

function addEmptyObjectForAmazonApiGateway() {
    const baseEmptySchema = {
        Empty: {
          type: "object",
          title: "Empty Schema"
        }
    }
    return baseEmptySchema
}

function addEmptySchema() {
    return {
        type: "object",
        $ref: "#/definitions/Empty"
    }
}

function findIndexOfStartBraces(path, bracesPos) {
    var searchStartIndex = 0
    var posIndex = -1
    while(bracesPos--) {
        posIndex = path.indexOf('{', posIndex + 1)
    } 
    return posIndex
}

function replacePathVar(path, varToReplace, replacedWith, swagger) {
    for(method in swagger.paths[path]) {
        for(param of swagger.paths[path][method]['parameters']) {
            if(param.in == 'path' && param.name == varToReplace) {
                param.name =  replacedWith
            } 
        }
    }
    swagger.paths[path.replace(varToReplace, replacedWith)] = swagger.paths[path]
    delete swagger.paths[path]
}

function resolveSameParentPath(swagger) {
    const pathsList = Object.keys(swagger.paths).sort()
    console.log(pathsList)

    for(var i = 0 ; i<pathsList.length - 1 ; i++) {
        var path = pathsList[i]
        var nextPath = pathsList[i+1]

        for(var startBracesPos = 1 ; ; startBracesPos++) {
            var pos = findIndexOfStartBraces(path, startBracesPos)
            if(pos == -1) break;
            if(path.substr(0, pos+1) === nextPath.substr(0, pos+1)) {
                var endPos = path.indexOf('}', pos)
                var nextEndPos = nextPath.indexOf('}', pos)

                var pathVar = path.substr(pos+1, endPos-pos-1)
                var nextPathVar = nextPath.substr(pos+1, nextEndPos - pos - 1)

                if( pathVar !== nextPathVar) {
                    replacePathVar(nextPath, nextPathVar, pathVar, swagger)
                    nextPath = nextPath.replace(nextPathVar, pathVar)
                    pathsList[i+1] = nextPath
                }
            } else {
                break
            }
        }
    }
    console.log(pathsList)
}

function convertSwaggerForApiGateWay(swagger) {

    resolveSameParentPath(swagger)

    if(swagger.basePath) {
        swagger.paths = Object.keys(swagger.paths).reduce(function (acc, path) {
            acc[swagger.basePath + path] = swagger.paths[path]
            return acc
        }, {})
        delete swagger.basePath
    }
    for(var path in swagger.paths) {
        for(var method in swagger.paths[path]) {
            // set amazon plugin
            swagger.paths[path][method]['x-amazon-apigateway-integration'] = addApiGatewayPlugin(
                path,
                swagger.paths[path][method]['parameters'] ? swagger.paths[path][method]['parameters']: [],
                method
            )
            // replace response schema with empty one
            for(var response in swagger.paths[path][method]['responses']) {
                if(swagger.paths[path][method]['responses'][response].schema) {
                    swagger.paths[path][method]['responses'][response].schema = addEmptySchema()
                }
            }
            // replace post body with empty schema too.
            if(method == 'post') {
                swagger.paths[path][method].parameters = swagger.paths[path][method].parameters.map((param) => {
                    if(param.in === 'body') {
                        param.schema = addEmptySchema()
                    }
                    return param
                })
            }
        }
    }
    // single empty definitions
    swagger.definitions = addEmptyObjectForAmazonApiGateway()
    return swagger
}

module.exports = {
    convertSwaggerForApiGateWay: convertSwaggerForApiGateWay
}