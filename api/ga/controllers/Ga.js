'use strict';
let view_id = '94883462';

module.exports = {
  async dashboard1(ctx) {
    const startDate = ctx.query.startDate;
    const endDate = ctx.query.endDate;
    const category = ctx.query.category;

    let pagePathLevel1 = '/';
    if (category !== '') {
      pagePathLevel1 = '/' + category + '/';
    }

    let basic_report = {
      'reportRequests': [


        // PAGEVIEWS, SESSIONS, avgSession duration, boundrate
        {
          'viewId': view_id,
          'dateRanges': [{
            'startDate': startDate,
            'endDate': endDate
          }],
          'metrics': [{
            'expression': 'ga:sessions'
          }, {
            'expression': 'ga:pageviews'
          }, {
            'expression': 'ga:avgSessionDuration'
          }, {
            'expression': 'ga:bounceRate'
          }],

          ...(category && {
            // 'dimensions': [{ 'name': 'ga:pagePath' }],
            'dimensionFilterClauses': [{
              'filters': [{
                'dimensionName': 'ga:pagePathLevel1',
                'operator': 'PARTIAL',
                'expressions': [category]
              }]
            }]
          })
        },


        // SESSIONS, PAGEVIEW day BY DAY
        {
          'viewId': view_id,
          'dateRanges': [{
            'startDate': startDate,
            'endDate': endDate
          }],
          'metrics': [{
            'expression': 'ga:sessions'
          }, {
            'expression': 'ga:pageviews'
          }],
          'dimensions': [{
              'name': 'ga:date'
            },
            // (category && { 'name': 'ga:pagePath' })
          ],
          ...(category !== '' && {
            'dimensionFilterClauses': [{
              'filters': [{
                'dimensionName': 'ga:pagePathLevel1',
                'operator': 'PARTIAL',
                'expressions': [category]
              }]
            }]
          })
        },

        // top 5 posts html
        // top 5 posts html
        {
          'viewId': view_id,
          'dateRanges': [{
            'startDate': startDate,
            'endDate': endDate
          }],
          'metrics': [{
            'expression': 'ga:pageviews'
          }],
          'dimensions': [{
              'name': 'ga:pagePath'
            },
            {
              'name': 'ga:pagePathLevel1'
            },
          ],
          'dimensionFilterClauses': [{
              'filters': [{
                'dimensionName': 'ga:pagePath',
                'operator': 'PARTIAL',
                'expressions': ['.html']
              }]
            },
            {
              'filters': [{
                'dimensionName': 'ga:pagePathLevel1',
                'operator': 'PARTIAL',
                'expressions': [pagePathLevel1]
              }]
            }
          ],
          'pageSize': '20',
          'orderBys': [{
            'fieldName': 'ga:pageviews',
            'sortOrder': 'DESCENDING'
          }]
        },

        // top 5 page path
        {
          'viewId': view_id,
          'dateRanges': [{
            'startDate': startDate,
            'endDate': endDate
          }],
          'metrics': [{
            'expression': 'ga:pageviews'
          }],
          'dimensions': [{
            'name': 'ga:pagePathLevel1'
          }],
          'pageSize': '15',
          'orderBys': [{
            'fieldName': 'ga:pageviews',
            'sortOrder': 'DESCENDING'
          }]
        },


      ]
    };

    return strapi.services.ga.getReports(basic_report);
  },

  dashboard2: async (ctx) => {
    const startDate = ctx.query.startDate;
    const endDate = ctx.query.endDate;
    const category = ctx.query.category;

    let pagePathLevel1 = '/';
    if (category !== '') {
      pagePathLevel1 = '/' + category + '/';
    }

    let basic_report = {
      'reportRequests': [
        // top 5 posts html
        {
          'viewId': view_id,
          'dateRanges': [{
            'startDate': startDate,
            'endDate': endDate
          }],
          'metrics': [{
            'expression': 'ga:pageviews'
          }],
          'dimensions': [{
              'name': 'ga:pagePath'
            },
            {
              'name': 'ga:pagePathLevel1'
            },
          ],
          'dimensionFilterClauses': [{
              'filters': [{
                'dimensionName': 'ga:pagePath',
                'operator': 'PARTIAL',
                'expressions': ['.html']
              }]
            },
            {
              'filters': [{
                'dimensionName': 'ga:pagePathLevel1',
                'operator': 'PARTIAL',
                'expressions': [pagePathLevel1]
              }]
            }
          ],
          'pageSize': '5',
          'orderBys': [{
            'fieldName': 'ga:pageviews',
            'sortOrder': 'DESCENDING'
          }]
        }
      ]
    };

    return strapi.services.ga.getReports(basic_report);
  },

  viewByID: async (ctx) => {
    const stringID = ctx.query.ids;
    const ids = stringID.split(',');

    let basic_report = {
      'reportRequests': [{
          'viewId': view_id,
          'dateRanges': [{
            'endDate': 'yesterday',
            'startDate': '30daysAgo'
          }],
          'metrics': [{
            'expression': 'ga:pageviews'
          }],
          'dimensions': [{
            'name': 'ga:pagePath'
          }],
          'dimensionFilterClauses': [{
            'filters': [
              ...(ids && ids.map(id => ({
                'dimensionName': 'ga:pagePath',
                'operator': 'PARTIAL',
                'expressions': [`${id}.html`]
              })))
            ]
          }],

        },

      ]
    };

    return strapi.services.ga.getReports(basic_report);
  }

};




// New vs. Returning Visitors
// {
//   'viewId': view_id,
//     'dateRanges': [{
//       'startDate': startDate,
//       'endDate': endDate
//     }],
//       'metrics': [{
//         'expression': 'ga:newUsers',
//       }, {
//         'expression': 'ga:users'
//       }]
// },


// // DEVICE BREAKDOWN
// {
//   'viewId': view_id,
//     'dateRanges': [{
//       'startDate': startDate,
//       'endDate': endDate
//     }],
//       'metrics': [{
//         'expression': 'ga:pageviews'
//       }],
//         'dimensions': [{
//           'name': 'ga:deviceCategory'
//         }]
// },


// top 10 COUNTRY
// {
//   'viewId': view_id,
//     'dateRanges': [{
//       'startDate': startDate,
//       'endDate': endDate
//     }],
//       'metrics': [{
//         'expression': 'ga:pageviews'
//       }],
//         'dimensions': [{
//           'name': 'ga:country'
//         }],
//           'pageSize': '10',
//             'orderBys': [{
//               'fieldName': 'ga:pageviews',
//               'sortOrder': 'DESCENDING'
//             }]
// },

// top 10 referral path
// {
//   'viewId': view_id,
//     'dateRanges': [{
//       'startDate': startDate,
//       'endDate': endDate
//     }],
//       'metrics': [{
//         'expression': 'ga:pageviews'
//       }],
//         'dimensions': [{
//           'name': 'ga:referralPath'
//         }],
//           'pageSize': '10',
//             'orderBys': [{
//               'fieldName': 'ga:pageviews',
//               'sortOrder': 'DESCENDING'
//             }]
// },
