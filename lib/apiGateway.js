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
    for(var path of Object.keys(swagger.paths)) {
        for(var method of Object.keys(swagger.paths[path])) {
            swagger.paths[path][method]['x-amazon-apigateway-integration'] = addApiGatewayPlugin(path, swagger.paths[path][method]['parameters'], method)
            swagger.paths[path][method]['responses']['200']['schema'] = addEmptySchema()

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
    swagger.definitions = addEmptyObjectForAmazonApiGateway()
    return swagger
}

module.exports = {
    convertSwaggerForApiGateWay: convertSwaggerForApiGateWay
}