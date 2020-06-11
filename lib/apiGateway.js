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
        if(param.in === 'path') {
            if(!basePlugin.requestParameters) {
                basePlugin.requestParameters = {}
            }
            basePlugin.requestParameters[`integration.request.path.${param.name}`] = `method.request.path.${param.name}`
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

function convertSwaggerForApiGateWay(swagger) {
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