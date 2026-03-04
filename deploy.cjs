const FtpDeploy = require("ftp-deploy");
const ftpDeploy = new FtpDeploy();

const config = {
  user: process.env.FTP_USER,
  password: process.env.FTP_PASSWORD,
  host: process.env.FTP_HOST,
  port: parseInt(process.env.FTP_PORT) || 21,
  localRoot: __dirname + "/out",
  remoteRoot: "/", // Deploy directly to the root directory
  include: ["*", "**/*"],
  exclude: [".git/**", ".DS_Store"],
  deleteRemote: true,
  forcePasv: true,
  sftp: false,
};

ftpDeploy
  .deploy(config)
  .then((res) => console.log("🚀 Deployment successful to israutomizer.com"))
  .catch((err) => console.error("❌ Deployment failed:", err));
