require('dotenv').config()
const express = require('express')
const cors = require('cors')
const app = express()
const fetch = require('node-fetch')
const Cloudant = require('@cloudant/cloudant');

const port = 3000
app.use(cors())

// Get token
var bearerToken
app.get('/token', (req, res) => {
  var uri = process.env.domain + '/user/activity/login'
  fetch(uri, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: process.env.usr,
        password: process.env.password
      })
    })
    .then(res => res.json())
    .catch( (err) => {
      res.json(err)
    })
    .then((json) => {
      bearerToken = json.token;
      console.log("authentication succeeded!");
      res.sendStatus(200)
    }) //bearerToken = json.token) //console.log(json))
})

// app.use(function(req, res, next) {
//   res.header("Access-Control-Allow-Origin", "*");
//   res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
//   next();
// });

var buildings
// var agg_endpoints = [
//   `/dtl/FootFallByFloorDetailPerFloor?buildingName=${buildingName}&floorName=${floorName}`
// ]

var estate_endpoints = [
  "/dtl/FootFallByHourEstate?timeOffset=+05:30",
  "/dtl/FootFallByHourPopupEstate?timeOffset=+05:30"
]

var parseBuildings = function(json) {
  // this is checking for a '_' to exclude non-building values such as "iotbi217_TOTAL" and "ESTATE_OCCUPANCY_SENSOR". TODO, need to find a more resilient method
  // console.log("json" + json)
  var buildings = json.filter(val => !val.src.includes('_')).map(building => ({id: building.src}))
  // console.log("buildings" + buildings)
  return [{id: "All"}].concat(buildings)
  // return JSON.stringify([{id: "building1"}, {id: "building2"}])
}

var initCloudant = function() {
  var username = process.env.cloudant_username || "nodejs";
  var password = process.env.cloudant_password
  var db_name = process.env.cloudant_db;
  var cloudant = Cloudant({account:username, password:password});
  cachedb = cloudant.db.use(db_name, function(err, body) {
    if (err) {
      console.log(err)
      cloudant.db.create(db_name, function(err, body) {
        console.log(err)
        console.log(body)
      })
    }
  })
}
initCloudant()

// get list of buildings
app.get('/getbuildings', (req, res) => {
  var uri = process.env.kitt_domain + `/graph/${process.env.instance_id}/instance/${process.env.instance_id}`
  fetch(uri, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${bearerToken}`
      }
  }).then(result => result.json()).then(json => { buildings = parseBuildings(json['ref-in'])} ).then( () => res.send(buildings) )
    // .then(json => buildings = json['ref-in'].filter(val => !val.src.includes('_')).map(building => building.src))
})

app.get('/getfootfall', (req, res) => {
  // add call (if no params for buildingname and floor pull data for entire estate)
  var endpoint = "/dtl/FootFallByHourEstate?timeOffset=+05:30"
  // var building = req.building
  // var building = "EGLD"
  // var endpoint = "/dtl/FootFallByHourPopupBuilding?buildingName=" + building
  // TODO data from current BI instance is mostly zeroes, generate random data

  var uri = process.env.agg_domain + endpoint
  fetch(uri, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${bearerToken}`
      }
  }).then(result => {console.log(result) ; result.json()}).catch( (err) => console.log(err))
    .then(json => {console.log(json) ; res.send(json)} )
  // TODO, form footfall data into datatable
  // '[["Time", "Footfall"], ["00:00", 31], ["01:00", 28], ["02:00", 31]]'
})

app.get('/getfootfall/:building', (req, res) => {
  // add call (if no params for buildingname and floor pull data for entire estate)
  var building = req.building
  // var building = "EGLD"
  var endpoint = "/dtl/FootFallByHourPopupBuilding?buildingName=" + building
  // TODO data from current BI instance is mostly zeroes, generate random data
  var uri = process.env.agg_domain + endpoint
  fetch(uri, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${bearerToken}`
      }
  })
  .then(result => {console.log(result) ; result.json()})
  .catch( (err) => console.log(err))
  .then(json => {console.log(json) ; res.send(json)} )
  // TODO, form footfall data into datatable
  // '[["Time", "Footfall"], ["00:00", 31], ["01:00", 28], ["02:00", 31]]'
})
// app.get('/generatetable/footfall', (req, res) => {
//   // add call (if no params for buildingname and floor pull data for entire estate)
//   var endpoint = "/dtl/FootFallByHourEstate?timeOffset=+05:30"
//   // var building = req.building
//   // var building = "EGLD"
//   // var endpoint = "/dtl/FootFallByHourPopupBuilding?buildingName=" + building
//   // TODO data from current BI instance is mostly zeroes, generate random data
//
//   var uri = process.env.agg_domain + endpoint
//   fetch(uri, {
//       method: 'GET',
//       headers: {
//         'Authorization': `Bearer ${bearerToken}`
//       }
//   }).then(result => {console.log(result) ; result.json()}).catch( (err) => console.log(err))
//     .then(json => {console.log(json) ; res.send(json)} )
//   // TODO, form footfall data into datatable
//   // '[["Time", "Footfall"], ["00:00", 31], ["01:00", 28], ["02:00", 31]]'
// })

app.get('/getsampledata', (req, res) => {
  // add call (if no params for buildingname and floor pull data for entire estate)
  res.setHeader('Content-Type', 'application/json');
  res.send('[["Building", "Occupancy"], ["B052", 31], ["B053", 28], ["B056", 31]]')
})

app.get('/getsampleoedata', (req, res) => {
  // add call (if no params for buildingname and floor pull data for entire estate)
  res.setHeader('Content-Type', 'application/json');
  res.send('[["Building", "Occupancy", "Energy (MWh)"], ["B052", 31, 155.65], ["B053", 28, 160.30], ["B056", 44, 101.89], ["B056", 44, 101.89],["B056", 44, 101.89], ["B056", 44, 101.89]]')
})

app.get('/getsampletabledata', (req, res) => {
  // add call (if no params for buildingname and floor pull data for entire estate)
  res.setHeader('Content-Type', 'application/json');
  res.send('[\
  {"id":"B008", "Occupancy":"30", "Percentage":"55%", "Prediction":"39" }, \
  {"id":"EGLD", "Occupancy":"52", "Percentage":"71%", "Prediction":"43" },\
  {"id":"B706", "Occupancy":"42", "Percentage":"75%", "Prediction":"42" },\
  {"id":"EGLC", "Occupancy":"80", "Percentage":"75%", "Prediction":"42" },\
  {"id":"B707", "Occupancy":"291", "Percentage":"75%", "Prediction":"42" },\
  {"id":"B705", "Occupancy":"103", "Percentage":"75%", "Prediction":"42" },\
  {"id":"B052", "Occupancy":"89", "Percentage":"75%", "Prediction":"42" }]')
})

app.get('/getsinglebuildingdata', (req, res) => {
  // add call (if no params for buildingname and floor pull data for entire estate)
  res.setHeader('Content-Type', 'application/json');
  res.send('[\
  {"id":"Floor1", "Occupancy":"30", "Percentage":"55%", "Prediction":"39" }, \
  {"id":"Floor2", "Occupancy":"52", "Percentage":"71%", "Prediction":"43" },\
  {"id":"Floor3", "Occupancy":"42", "Percentage":"75%", "Prediction":"42" },\
  {"id":"Floor4", "Occupancy":"80", "Percentage":"75%", "Prediction":"42" },\
  {"id":"Floor5", "Occupancy":"89", "Percentage":"75%", "Prediction":"42" }]')
})


// [{"id":"All"},{"id":"B008"},{"id":"EGLD"},{"id":"B706"},{"id":"EGLC"},{"id":"B707"},{"id":"B705"},{"id":"B052"}

app.get('/getsampleoccupancy', (req, res) => {
  var data = {
      "updatedTime": "2018-02-08T04:30:00.023+0530",
      "data": {
          "next": [156, 60, 60, 22, 60, 46, 28],
          "previous": [8, 0, 26, 40, 40, 40, 40],
          "time": [
              "2018-02-02T00:00:00.000+0000",
              "2018-02-03T00:00:00.000+0000",
              "2018-02-04T00:00:00.000+0000",
              "2018-02-05T00:00:00.000+0000",
              "2018-02-06T00:00:00.000+0000",
              "2018-02-07T00:00:00.000+0000",
              "2018-02-08T00:00:00.000+0000"
          ]
      },
      "city": "Bengaluru",
      "timeOffset": "+05:30"
  }
  var gchartsData = [["time", "occupancy"]]
  for (idx in data['data'].time) {
      gchartsData.push([
        data['data']['time'][idx],
        data['data']['next'][idx]
      ])
  }
  // add call (if no params for buildingname and floor pull data for entire estate)

  res.setHeader('Content-Type', 'application/json');
  // res.send(data)
  res.send(gchartsData)
})


var genListRandomInts = function (max, numVals) {
  var arr = []
  for (i = 0; i < numVals; i++) {
    console.log(i)
    arr.push(Math.floor(Math.random() * Math.floor(max)));
    if (i == (numVals - 1)) {
      return arr
    }
  }
}

var formatGChart = function (xaxis, values) {
  // example
  // var xaxis = ["0:00", "01:00","02:00","03:00","04:00","05:00","06:00","07:00","08:00","09:00","10:00","11:00","12:00","1:00","2:00","3:00","4:00","5:00","6:00","7:00","8:00","9:00","12:00"]
}

app.get('/getsamplelinedata', (req, res) => {
  // add call (if no params for buildingname and floor pull data for entire estate)
  res.setHeader('Content-Type', 'application/json');
  res.send('[["Time", "B008", "EGLD", "EGLD"],  \
    ["06:00", 12, 10, 4], \
    ["07:00", 16, 12, 6], \
    ["08:00", 21, 20, 10], \
    ["09:00", 24, 13, 14], \
    ["10:00", 24, 42, 20], \
    ["11:00", 24, 20, 19], \
    ["12:00", 24, 42, 27], \
    ["13:00", 24, 21, 14], \
    ["14:00", 24, 95, 31], \
    ["15:00", 24, 64, 33], \
    ["16:00", 24, 20, 21], \
    ["17:00", 24, 86, 15], \
    ["18:00", 24, 20, 14]]')
})
// [["time","occupancy"],["2018-02-02T00:00:00.000+0000",156],["2018-02-03T00:00:00.000+0000",60],["2018-02-04T00:00:00.000+0000",60],["2018-02-05T00:00:00.000+0000",22],["2018-02-06T00:00:00.000+0000",60],["2018-02-07T00:00:00.000+0000",46],["2018-02-08T00:00:00.000+0000",28]]
//the "estate" endpoints need parameters, the others work by adding params
// /api/v1/dtl/FootFallByFloorDetailPerFloor?buildingName=Munich&floorName=Munich_FLOOR1



// occupancy object looks like so...TODO, hourly graph of
// {
//     "next": {
//         "unit": "count",
//         "value": 76
//     },
//     "updatedTime": "2018-02-08T04:30:00.023+0530",
//     "previous": {
//         "unit": "count",
//         "value": 32
//     },
//     "timeOffset": "+05:30",
//     "extended": "demographics",
//     "demographics": {
//         "men": {
//             "count": 9,
//             "averageAge": 47
//         },
//         "women": {
//             "count": 9,
//             "averageAge": 26
//         }
//     }
// }


app.get('/test', function(req, res) {
  res.send(200)
});
// app.get('/ui', function(req, res) {
//     res.sendFile('./index.html', {root: '.'});
// });
// app.use(express.static(__dirname));
// app.use(express.static(__dirname + '/src'));
app.listen(port, () => console.log(`Example app listening on port ${port}!`))
