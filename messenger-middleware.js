'use strict';

module.exports = {
    quick_replies: (bot, message, next) => {
        if (message.quick_replies) {
            let processed = [];
            message.quick_replies.forEach(rep => {
                processed.push({
                    content_type: 'text',
                    title: rep,
                    payload: rep
                })
            });
            //sending an empty array to the Messenger API throws an error
            if (processed.length == 0) {
                processed = undefined;
            }

            message.quick_replies = processed;
        }
        next();
    },
    image: (bot, message, next) => {
        if ((message.attachment) && (message.attachment.image)) {
            message.attachment = {
                type: 'image',
                payload: {
                    url: message.attachment.image
                }
            };
            delete message.attachment.image;
        }
        next();
    }
}
