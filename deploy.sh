git reset --hard HEAD
git pull origin master
yarn install
if [ -z "$1" ]
then
  NODE_ENV=production yarn build
  pm2 reload ecosystem.config.js --env production
else
  yarn build
  pm2 reload ecosystem.config.js --env $1
  
fi
