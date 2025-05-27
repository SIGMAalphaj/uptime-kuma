const NotificationProvider = require("./notification-provider");
const axios = require("axios");
const { DOWN, UP } = require("../../src/util");

class Discord extends NotificationProvider {
    name = "discord";

    /**
     * @inheritdoc
     */
    async send(notification, msg, monitorJSON = null, heartbeatJSON = null) {
        const okMsg = "Sent successfully.";
        const discordDisplayName = notification.discordUsername || "Uptime Kuma";

        try {
            // Prepare the webhook URL
            const webhookUrl = new URL(notification.discordWebhookUrl);
            
            // Handle thread if specified
            if (notification.discordChannelType === "postToThread") {
                webhookUrl.searchParams.append("thread_id", notification.threadId);
            }

            // Test notification (no heartbeat data)
            if (heartbeatJSON == null) {
                const testPayload = {
                    username: discordDisplayName,
                    content: msg
                };

                if (notification.discordChannelType === "createNewForumPost") {
                    testPayload.thread_name = notification.postName;
                }

                await axios.post(webhookUrl.toString(), testPayload);
                return okMsg;
            }

            // Prepare base content with mentions
            let content = "";
            if (notification.discordPrefixMessage) {
                content += notification.discordPrefixMessage + " ";
            }
            
            // Add @everyone or @here if specified
            if (notification.discordMentionEveryone) {
                content += "@everyone ";
            }
            if (notification.discordMentionHere) {
                content += "@here ";
            }

            // Prepare message body
            let messageBody = `Hello! We have a new update..\n\n`;
            
            if (heartbeatJSON.status === UP) {
                messageBody += `UP: ${monitorJSON.name}\n`;
            } else if (heartbeatJSON.status === DOWN) {
                messageBody += `DOWN: ${monitorJSON.name}\n`;
            }
            
            messageBody += `Service Name\tService URL\n\n`;
            messageBody += `${monitorJSON.name}\t${this.extractAddress(monitorJSON)}\n\n`;
            messageBody += `Time\n${heartbeatJSON.localDateTime} (${heartbeatJSON.timezone})\n\n`;
            
            if (heartbeatJSON.ping) {
                messageBody += `Ping\n${heartbeatJSON.ping} ms\n\n`;
            }
            
            messageBody += `Uptime Kuma • Automated Monitoring • Today at ${new Date(heartbeatJSON.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})`;

            // Prepare final payload
            const payload = {
                username: discordDisplayName,
                content: content + messageBody
            };

            // Handle forum post creation
            if (notification.discordChannelType === "createNewForumPost") {
                payload.thread_name = notification.postName;
            }

            await axios.post(webhookUrl.toString(), payload);
            return okMsg;

        } catch (error) {
            this.throwGeneralAxiosError(error);
        }
    }
}

module.exports = Discord;
