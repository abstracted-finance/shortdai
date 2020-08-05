const { program } = require("commander");

require("./commands/deploy.js").cmd(program);

program.parse(process.argv);
