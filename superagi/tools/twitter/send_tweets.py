from typing import Type

from pydantic import BaseModel, Field

from superagi.helper.twitter_helper import TwitterHelper
from superagi.helper.twitter_tokens import TwitterTokens
from superagi.tools.base_tool import BaseTool

import json 

class SendTweetsInput(BaseModel):
    tweet_text: str = Field(...,
                            description="Tweet text to be posted from twitter handle, if no value is given keep the default value as 'None'")
    is_media: bool = Field(..., description="'True' if there is any media to be posted with Tweet else 'False'.")
    media_files: list = Field(..., description="Name of the media files to be uploaded.")
    is_reply: bool = Field(..., description="'True' if you want to reply to any tweet else 'False'.")
    in_reply_to_tweet_id: str = Field(..., description="Tweet ID of the tweet to which you want to reply to, if no value is given keep the default value as 'None'")

class SendTweetsTool(BaseTool):
    name: str = "Send Tweets Tool"
    args_schema: Type[BaseModel] = SendTweetsInput
    description: str = "Send and Schedule Tweets for your Twitter Handle"
    agent_id: int = None
    agent_execution_id: int = None

    def _execute(self, is_media: bool, is_reply: bool, tweet_text: str = None, media_files: list = [], in_reply_to_tweet_id: str = None):
        toolkit_id = self.toolkit_config.toolkit_id
        session = self.toolkit_config.session
        creds = TwitterTokens(session).get_twitter_creds(toolkit_id)
        params = {}
        if is_media:
            media_ids = TwitterHelper().get_media_ids(session, media_files, creds, self.agent_id,
                                                      self.agent_execution_id)
            params["media"] = {"media_ids": media_ids}
        if tweet_text is not None:
            params["text"] = tweet_text
        if is_reply and in_reply_to_tweet_id is not None:
            params["reply"] = {"in_reply_to_tweet_id": in_reply_to_tweet_id}
        tweet_response = TwitterHelper().send_tweets(params, creds)
        if tweet_response.status_code == 201:
            resp = tweet_response.json()
            return "Tweet posted successfully!! Returned Tweet ID: {}".format(resp["data"]["id"])
        else:
            return "Error posting tweet. (Status code: {}, Original Params: {})".format(tweet_response.status_code, params)
