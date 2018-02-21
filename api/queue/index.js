function jobQueueModule($imports) {
        const { app, utils } = $imports;
        const eventEmitter = utils.eventEmitter;
        const JobQueue = require("./JobQueue");
        const jq = new JobQueue();

        eventEmitter.on("queue:enqueue", onEnqueue);

        function onEnqueue(taskData) {
        	jq.push(taskData);
        };
        
        function onError(error) {
            console.error(error);
            return {
                code: "queue:error",
                msg: error.message,
                stack: error.stack.split("\n")
            };
        };
};

module.exports = jobQueueModule;
