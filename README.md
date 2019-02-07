<!-- Put badges at the very top -->
<!-- Change the repo -->
[![Build Status](https://travis-ci.org/IBM/watson-banking-chatbot.svg?branch=master)](https://travis-ci.org/IBM/watson-banking-chatbot)




<!-- TODO:
Consider using cloud functions as a backend, persist token and other variables as params or in cloudant -->

<!-- Add a new Title and fill in the blanks -->
# IoT - Integrate a TRIRIGA Perceptive App with Building Insights APIs

In this Code Pattern, we'll go through the process of creating a custom Application to visualize Building Insights data within a TRIRIGA instance. The Building Insights service tracks sensor data such as energy consumed per hour, number of people on each floor in a building, and so on. When the reader has completed this Code Pattern, they will understand how to:
- Design and publish a customized Polymer application to a TRIRIGA instance
- Pull Occupancy and Energy data via Building Insights APIs.
- Persist historical data in a Cloudant database
<!-- - Detect user proximity to certain zones in workplace  -->

<!--Optionally, add flow steps based on the architecture diagram-->
## Flow
1. Building Insights (BI) instance updates sensor data hourly, and make the data available via a series of APIs.
2. Node.js backend requests updated dataset from BI APIs every hour, and persists certain values into a Cloudant database. This allows for us to build a chronological hourly dataset which can be used to create custom analytics models/graphics.
3. Custom TRIRIGA app pulls formatted sensor data from Node.js backend to render graphics and tables.

<!-- Optionally, update this section when the video is created -->
# Watch the Video
[![](https://img.youtube.com/vi/69QPCkQNsJ8/1.jpg)](https://www.youtube.com/watch?v=69QPCkQNsJ8)

# Steps

<!-- there are MANY updates necessary here, just screenshots where appropriate -->
1. [Deploy Cloud Services](#1-deploy-cloud-services)
2. [Register Application In TRIRIGA Dashboard](#2-generate-application-in-tririga-dashboard)
3. [Deploy Node.js application](#3-deploy-nodejs-application)
4. [Push Perceptive App to TRIRIGA](#4-push-perceptive-app-to-tririga)

## Install Prerequisites:
### IBM Cloud CLI
To interact with the hosted offerings, the IBM Cloud CLI will need to be installed beforehand. The latest CLI releases can be found at the link [here](https://console.bluemix.net/docs/cli/reference/bluemix_cli/download_cli.html#download_install). An install script is maintained at the mentioned link, which can be executed with one of the following commands

```
# Mac OSX
curl -fsSL https://clis.ng.bluemix.net/install/osx | sh

# Linux
curl -fsSL https://clis.ng.bluemix.net/install/linux | sh

# Powershell
iex(New-Object Net.WebClient).DownloadString('https://clis.ng.bluemix.net/install/powershell')
```
After installation is complete, confirm the CLI is working by printing the version like so
```
ibmcloud -v
```

Also install the container service plugin
```
ibmcloud plugin install container-service
```

### Kubernetes CLI
*Linux*
```
sudo apt-get update && sudo apt-get install -y apt-transport-https
curl -s https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo apt-key add -
echo "deb http://apt.kubernetes.io/ kubernetes-xenial main" | sudo tee -a /etc/apt/sources.list.d/kubernetes.list
sudo apt-get update
sudo apt-get install -y kubectl
```

*MacOS*
```
brew install kubernetes-cli
```

<!-- ### Node.js + NPM
If expecting to run this application locally, please continue by installing [Node.js](https://nodejs.org/en/) runtime and NPM. We'd suggest using [nvm](https://github.com/creationix/nvm) to easily switch between node versions, which can be done with the following commands
```
curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.11/install.sh | bash
# Place next three lines in ~/.bash_profile
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion
nvm install v8.9.0
nvm use 8.9.0
``` -->

<!-- ### Docker
*Mac OSX* -->

# Steps
<!-- Use the ``Deploy to IBM Cloud`` instructions **OR** create the services and run locally. -->

### 1. Provision Watson services via IBM Cloud and IBM Marketplace dashboards

Create the following services:
* [**TRIRIGA**](https://www.ibm.com/us-en/marketplace/ibm-tririga)
* [**TRIRIGA Building Insights**](https://www.ibm.com/us-en/marketplace/iot-building-insights)
* [**Kubernetes**](https://console.bluemix.net/catalog/infrastructure/containers-kubernetes)
* [**Cloudant**](https://console.bluemix.net/catalog/services/cloudant)


### 2. Generate Application In TRIRIGA Dashboard
To upload our application to TRIRIGA, we'll need to first enter a few metadata records.

Log in to the TRIRIGA Dashboard and click on the "Tools" section in the top menu
<!-- TODO, add picture -->


Next, click "Model Designer"

<p align="center">
<img src="https://i.imgur.com/BXqwkxs.png" height="500" width="800" />
</p>


Click the "Add" button, and then enter a name for the application into the "Name", "ID", and "Exposed Name" Fields

<p align="center">
<img src="https://i.imgur.com/OnVVGPQ.png" height="200" width="600" />
</p>

Click on the "Tools" section in the top menu again, and select the "Model and View Designer" icon

<p align="center">
<img src="https://i.imgur.com/3KVOC2u.png" height="500" width="800" />
</p>

Click the "Add" button, and then enter a name for the application. The name entered in the previous step can go into the "Name", "ID", and "Exposed Name" fields. Also confirm the "View Type" section has "Web View" selected.

<p align="center">
<img src="https://i.imgur.com/xelME79.png" height="200" width="600" />
</p>

Return to the "Tools" section again, and select "Application designer". The same value entered in the previous step can go into the "Name", and "ID", and "Exposed Name" fields. Also add a string descriptor in the "Label" section

<p align="center">
<img src="https://i.imgur.com/rYYRkhe.png" height="200" width="600" />
</p>


Return to the "Tools" section a final time, and select "Web View Designer". The name entered in the previous steps can go into the "Name", and "ID" fields. The "Exposed Name" field will need to include a underscore, we'll use "tut-occupancy" in this case.

<p align="center">
<img src="https://i.imgur.com/DXp1OYC.png" height="200" width="600" />
</p>


Next, open a terminal and navigate to the `app` directory

Run the following command using the included `WebViewSync_3.6.0.jar` binary to authenticate to the TRIRIGA server. This will prompt for the URL, and credentials, and place them in a `WebViewSync.json` file.
```
java -jar WebViewSync_3.6.0.jar init
```

To generate a custom view, we can execute the "add view" command. This generates and pulls a template that can be used as a starting point. In this case, we've already placed a modified starter template in the `app` directory, so this step can be bypassed.

```
java -jar WebViewSync_3.6.0.jar addview --view <app_name> --starter
```
<!-- Enable "sync" so any change that gets made automatically gets propagated to tririga server
java -jar WebViewSync_3.6.0.jar sync --all -->


### 3. Deploy Node.js application
After configuring the TRIRIGA dashboard, we can continue on to deploy the nodejs backend. The purpose of this process is to add additional logic to periodically query for building sensor data, perform data transformations, and to persist data in a database.

Create a kubernetes cluster
```
ibmcloud ks cluster-create --name my_cluster
```

Export the `KUBECONFIG` path. This value will be printed just after creating the container cluster
```
export KUBECONFIG=/Users/$USER/.bluemix/plugins/container-service/clusters/mycluster/kube-config-hou02-mycluster.yml
```

Place the Cloudant credentials in a .env file like so
```
CLOUDANT_USERNAME="username"
CLOUDANT_PASSWORD="password"
CLOUDANT_DB="buildingdb"
```

Create a kubernetes "secret", which allows the above credentials to be set as environment variables in the container runtime
```
kubectl create secret generic cloudant-auth --from-file=.env
```

Deploy the kubernetes application with the following command
```
kubectl apply -f kubernetes/kube-config.yml
```

Finally, get the public ip address of the Kubernetes cluster with the following commands
```
# Get id of cluster
ibmcloud ks clusters

# Print workers associated with cluster, take note of public ip.
ibmcloud ks workers <cluster_name>
```

### 4. Push Perceptive App to TRIRIGA

Open the file at `./app/tut-occupancy/tut-occupancy.html`, and edit lines 236-242, replacing each of the iron-ajax URLs with the public kubernetes cluster ip from the previous step.

Next, run the following commands to push the application code to the TRIRIGA server.
```
cd app
java -jar WebViewSync_3.5.3.jar push -a --force
```

If the push is successful, the application should be accessible at the following endpoint

**http://${TRIRIGA_URL}/tririga/p/web/${APP_NAME}**

<p align="center">
<img src="https://i.imgur.com/N4weh9t.png" height="500" width="800" />
</p>

Each of the visuals in the front end application are represented as Polymer elements, which allows for us to reference packages in a HTML like syntax.

First, we'll generate a table that shows a list of each of the buildings, and their last reported occupancy. This also shows how close each building is to capacity, as well as the predicted occupancy in the next hour.

This table is rendered by utilizing the `triblock-table` element. To fetch the data for this element, the application will first make a call to the "/getbuildings" endpoint defined in the backend, which pulls and parses the registered building IDs from the Building Insights instance. This is done by making an HTTP request using the `iron-ajax` package like so. The url defines the endpoint the application will be making a call to, and the `last-response` key sets the response as a variable, which can then be referenced by any of the other Polymer elements

```
<iron-ajax auto url="http://127.0.0.1/genbuildingtable" handle-as="json" last-response="{{ajaxSampleTable}}"></iron-ajax>
```

After the building IDs have been collected, the application then queries the BI `/FootFallByHourPopupBuilding` endpoint for each registered building. The results are then parsed and aggregated into an array of JSON objects like so.

```
'[\
{"id":"B008", "Occupancy":"30", "Percentage":"55%", "Prediction":"39" }, \
{"id":"EGLD", "Occupancy":"52", "Percentage":"71%", "Prediction":"43" },\
...
]
```

Each object in the above payload can then be loaded in the table with the following syntax. Note the "property" in the `triblock-table-column` definition matches the keys in the above objects. And the result of the above iron-ajax call is set to the `data` key

```
<triblock-table id="table1"  title="Occupancy Stats" data="{{ajaxSampleTable}}" style="width:100%; height:500px;">
      <triblock-table-column title="Building" property="id"></triblock-table-column>
      <triblock-table-column title="Occupancy" property="Occupancy"></triblock-table-column>
      <triblock-table-column title="Percentage" property="Percentage"></triblock-table-column>
      <triblock-table-column title="Prediction (Next hour)" property="Prediction"></triblock-table-column>
</triblock-table>
```

<p align="center">
<img src="https://i.imgur.com/FVw1OM9.png" height="500" width="800" />
</p>

The next visual shows a line graph comparing the hourly occupancy of each building during the last reported workday (6 AM - 6 PM). This is rendered via the third party "Google Charts" package, which is pre-installed as part of the TRIRIGA instance.

This chart can be rendered with the following Polymer syntax
```
<google-chart
  style="width:100%; height:400px;"
  type='line'
  options='{"title": "Estate Occupancy (24hr)"}'
  data="{{ajaxLineData}}"
</google-chart>
```

And the chart expects an "array of arrays" like so.
```
'[
  ["Time", "B008", "EGLD", "EGLD"],  \
  ["06:00", 12, 10, 4], \
  ["07:00", 16, 12, 6], \
  ["08:00", 21, 20, 10], \
  ...  
]'
```

<p align="center">
<img src="https://i.imgur.com/3z2dOfw.png" height="500" width="800" />
</p>


#### Additional Docs

TRIRIGA Perceptive App Documentation
https://www.ibm.com/developerworks/community/wikis/home?lang=en#!/wiki/IBM%20TRIRIGA1/page/What%20are%20Perceptive%20apps

Perceptive Space Assessment
https://www.ibm.com/developerworks/community/wikis/home?lang=en#!/wiki/IBM%20TRIRIGA1/page/What%27s%20the%20new%20Space%20Assessment%20app


## License

This code pattern is licensed under the Apache License, Version 2. Separate third-party code objects invoked within this code pattern are licensed by their respective providers pursuant to their own separate licenses. Contributions are subject to the [Developer Certificate of Origin, Version 1.1](https://developercertificate.org/) and the [Apache License, Version 2](https://www.apache.org/licenses/LICENSE-2.0.txt).

[Apache License FAQ](https://www.apache.org/foundation/license-faq.html#WhatDoesItMEAN)
