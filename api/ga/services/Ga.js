'use strict';
const {
  google
} = require('googleapis');

const service_account = require('./bold-impulse-270104-8fa24972b987.json');
const reporting = google.analyticsreporting('v4');
let scopes = ['https://www.googleapis.com/auth/analytics.readonly'];

let jwt = new google.auth.JWT(
  service_account.client_email,
  null,
  service_account.private_key,
  scopes
);

let view_id = '94883462';

module.exports = {

  getReports: async (reports) => {
    await jwt.authorize();
    const request = {
      'headers': {
        'Content-Type': 'application/json'
      },
      'auth': jwt,
      'resource': reports
    };
    const reportData = await reporting.reports.batchGet(request);

    return reportData.data;
  },
};
