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

            // Prepare base payload
            const payload = {
                username: discordDisplayName,
                embeds: [{
                    timestamp: heartbeatJSON.time,
                    fields: [
                        {
                            name: "Service Name",
                            value: monitorJSON.name,
                            inline: true
                        },
                        {
                            name: `Time (${heartbeatJSON.timezone})`,
                            value: heartbeatJSON.localDateTime,
                            inline: true
                        }
                    ]
                }]
            };

            // Add URL field if not disabled
            if (!notification.disableUrl) {
                payload.embeds[0].fields.push({
                    name: monitorJSON.type === "push" ? "Service Type" : "Service URL",
                    value: this.extractAddress(monitorJSON),
                    inline: true
                });
            }

            // Handle DOWN status
            if (heartbeatJSON.status === DOWN) {
                payload.embeds[0].title = `🔴 ${monitorJSON.name} is DOWN`;
                payload.embeds[0].color = 0xff3333; // Red
                payload.embeds[0].fields.push({
                    name: "Error",
                    value: heartbeatJSON.msg || "No error message provided",
                    inline: false
                });
            } 
            // Handle UP status
            else if (heartbeatJSON.status === UP) {
                payload.embeds[0].title = `🟢 ${monitorJSON.name} is UP`;
                payload.embeds[0].color = 0x33ff33; // Green
                
                if (heartbeatJSON.ping) {
                    payload.embeds[0].fields.push({
                        name: "Ping",
                        value: `${heartbeatJSON.ping} ms`,
                        inline: true
                    });
                }
            }

            // Add prefix message if specified
            if (notification.discordPrefixMessage) {
                payload.content = notification.discordPrefixMessage;
            }

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
