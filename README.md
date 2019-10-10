# Time To Eat
## Technology used
- Node.js, Express, AWS S3, API Gateway, Lambda, `aws-serverless-express` library
## Usage
This project has been hosted by AWS with the resource `https://btbuyftb2l.execute-api.ap-southeast-2.amazonaws.com/dev/`.
Therefore, you can request through the resource + the endpoint.
### Available Endpoints
* Create user example:
    * POST https://btbuyftb2l.execute-api.ap-southeast-2.amazonaws.com/dev/user
 
Request body:

    [
        {
          "key": "newworld",
          "schedule":"Mo-Fr 01:00-22:00",
          "frequency": 1
        }
    ]
* Delete user example:
    * DELETE https://btbuyftb2l.execute-api.ap-southeast-2.amazonaws.com/dev/user/newUser
* Update user example:
    * PATCH https://btbuyftb2l.execute-api.ap-southeast-2.amazonaws.com/dev/user

Request body:

    [
        {
          "key": "newworld",
          "schedule":"Mo-Fr 01:00-22:00",
          "frequency": 1
        }
    ]
* Login user example:
    * POST https://btbuyftb2l.execute-api.ap-southeast-2.amazonaws.com/dev/user/login?username=nqt123&password=123456
* Logout user example:
    * POST https://btbuyftb2l.execute-api.ap-southeast-2.amazonaws.com/dev/user/logout
* Update new content for all users example:
    * GET https://btbuyftb2l.execute-api.ap-southeast-2.amazonaws.com/dev/user/trigger/
* Update new content for specific user example:
    * GET https://btbuyftb2l.execute-api.ap-southeast-2.amazonaws.com/dev/user/trigger/newworld
* Signup example:
    * POST https://btbuyftb2l.execute-api.ap-southeast-2.amazonaws.com/dev/user/register?username=nqt123&password=123456
