const core = require('@actions/core');
const tmp = require('tmp');
const fs = require('fs');

export class TaskDefinition {
    _container = {
        name: "",
        image: "",
        memoryReservation: 0,
        cpu: 0,
        environment: [],
        environmentFiles: [],
        portMappings: [],
        logConfiguration: {
            logDriver: "",
            options: {}
        },
    };

    _cpu = 0
    _memory = 0
    _runtimePlatform = null
    _networkMode = null;
    _family = "";
    _taskRoleArn = "";
    _executionRoleArn = "";
    _requiresCompatibilities = ["FARGATE", "EC2"];

    constructor() {
        this.containerName = core.getInput('container-name', {required: true});
        this.containerImage = core.getInput('image', {required: true});

        /** Environment Variables */
        this.containerEnvironmentVariables = core.getInput('environment-variables', {required: false});
        this.containerEnvironmentVariablesFiles = core.getInput('environment-variables-files', {required: false});

        this.family = core.getInput('family', {required: false});
        this.taskRoleArn = core.getInput('task-role-arn', {required: false});
        this.executionRoleArn = core.getInput('execution-role-arn', {required: false});

        this.containerMemoryReservation = core.getInput('memory-reservation', {required: false});
        this.containerCpu = core.getInput('cpu', {required: false});

        /** Port Mapping */
        this.containerPortMappingTcp = core.getInput('port-mapping-tcp', {required: false});
        this.containerPortMappingUdp = core.getInput('port-mapping-udp', {required: false});

        this.networkMode = core.getInput('network-mode', {required: false});
        this.runtimePlatform = core.getInput('runtime-platform-options', {required: false});

        this.cpu = core.getInput('cpu', {required: false});
        this.memory = core.getInput('memory-reservation', {required: false});

        /** Logs */
        this.containerLogDriver = core.getInput('log-driver', {required: false});
        this.containerLogDriverOptions = core.getInput('log-driver-options', {required: false});
    }

     build() {
        const updatedTaskDefFile = tmp.fileSync({
            tmpdir: process.env.RUNNER_TEMP,
            prefix: 'task-definition-',
            postfix: '.json',
            keep: true,
            discardDescriptor: true
        });

        const taskDef = {
            containerDefinitions: [
                this.container
            ],
            family: this.family,
            taskRoleArn: this.taskRoleArn,
            executionRoleArn: this.executionRoleArn,
            networkMode: this.networkMode,
            cpu: +this.cpu,
            memory: +this.memory,
            runtimePlatform: this.runtimePlatform,
            volumes: [],
            placementConstraints: [],
            requiresCompatibilities: this._requiresCompatibilities,
        };

        const newTaskDefContents = JSON.stringify(taskDef, null, 2);
        fs.writeFileSync(updatedTaskDefFile.name, newTaskDefContents);
        core.setOutput('task-definition', updatedTaskDefFile.name);
    }

    get container() {
        return this._container;
    }

    get cpu() {
        return this._cpu;
    }

    get memory() {
        return this._memory;
    }

    get networkMode() {
        return this._networkMode;
    }

    get runtimePlatform() {
        return this._runtimePlatform;
    }

    get taskRoleArn() {
        return this._taskRoleArn;
    }

    get executionRoleArn() {
        return this._executionRoleArn;
    }

    set networkMode(value) {
        this._networkMode = value;
    }

    set taskRoleArn(value) {
        this._taskRoleArn = value;
    }

    set executionRoleArn(value) {
        this._executionRoleArn = value;
    }

    get family() {
        return this._family;
    }

    set family(value) {
        this._family = value;
    }

    set containerCpu(name) {
        this._container.cpu = name;
    }

    set containerMemoryReservation(value) {
        this._container.memoryReservation = value;
    }

    set containerName(name) {
        this._container.name = name;
    }

    set cpu(name) {
        this._cpu = name;
    }

    set memory(name) {
        this._memory = name;
    }

    set containerImage(image) {
        this._container.image = image;
    }

    set containerLogDriver(driver) {
        this._container.logConfiguration.logDriver = driver;
    }

    set containerEnvironmentVariablesFiles(files) {
        files.split('\n').forEach((line) => {
            const trimmedLine = line.trim();
            if (trimmedLine.length === 0) {
                return;
            }

            const variable = {
                type: 's3',
                value: trimmedLine,
            };

            const variableDef = this._container.environmentFiles.find((e) => {
                return e.value === variable.value;
            });
            if (variableDef) {
                variableDef.value = variable.value;
            } else {
                this._container.environmentFiles.push(variable);
            }
        });
    }

    set containerEnvironmentVariables(variables) {
        variables.split('\n').forEach((line) => {
            const trimmedLine = line.trim();
            if (trimmedLine.length === 0) {
                return;
            }

            const separatorIdx = trimmedLine.indexOf("=");
            if (separatorIdx === -1) {
                throw new Error(`Cannot parse the environment variable '${trimmedLine}'. Environment variable pairs must be of the form NAME=value.`);
            }

            const variable = {
                name: trimmedLine.substring(0, separatorIdx),
                value: trimmedLine.substring(separatorIdx + 1),
            };

            const variableDef = this._container.environment.find((e) => {
                return e.name === variable.name
            });

            if (variableDef) {
                variableDef.value = variable.value;
            } else {
                this._container.environment.push(variable);
            }
        });
    }

    set containerLogDriverOptions(options) {
        let optionsParsed = {};
        options.split('\n').forEach((option) => {
            const logDriverOption = option.trim();
            if (logDriverOption.length === 0) {
                return;
            }
            const logDriverOptionSplit = logDriverOption.split("=");
            optionsParsed[logDriverOptionSplit[0]] = logDriverOptionSplit[1];
        });

        this._container.logConfiguration.options = optionsParsed;
    }

    set runtimePlatform(options) {
        let optionsParsed = {};
        options.split('\n').forEach((option) => {
            const runtimePlatformOption = option.trim();
            if (runtimePlatformOption.length === 0) {
                return;
            }
            const runtimePlatformOptionSplit = runtimePlatformOption.split("=");
            optionsParsed[runtimePlatformOptionSplit[0]] = runtimePlatformOptionSplit[1];
        });

        this._runtimePlatform = optionsParsed;
    }

    set containerPortMappingTcp(portMappingTcp) {
        portMappingTcp.split('\n').forEach((ports) => {
            const portsTrimmed = ports.trim();
            if (portsTrimmed.length === 0) {
                return;
            }
            const portsSplit = portsTrimmed.split("=");
            this._container.portMappings.push({
                containerPort: parseInt(portsSplit[0]),
                hostPort: parseInt(portsSplit[1]),
                protocol: "tcp"
            });
        });
    }

    set containerPortMappingUdp(portMappingUdp) {
        portMappingUdp.split('\n').forEach((ports) => {
            const portsTrimmed = ports.trim();
            if (portsTrimmed.length === 0) {
                return;
            }
            const portsSplit = portsTrimmed.split("=");
            this._container.portMappings.push({
                containerPort: parseInt(portsSplit[0]),
                hostPort: parseInt(portsSplit[1]),
                protocol: "udp"
            });
        });
    }
}


try {
    const taskDefinition = new TaskDefinition();
    taskDefinition.build();
} catch (error) {
    core.setFailed(error.message);
}
