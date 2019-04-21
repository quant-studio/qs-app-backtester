# Quant Studio Demo App

Quant Studio apps run client-side, and are loaded in an iframe on the side of Quant Studio projects.

Once installed in q project, an app will have access to the project's data & dataset.

Apps also support drag & drops from the project's components.

----------------


This app is a very basic demo of a Quant Studio sidebar app that you can run on your localhost.

It showcases the Quant Studio SDK and the available events and methods.

## Local installation

Clone the app at [https://github.com/26medias/Quant-Studio-Demo-App]()

	git clone git@github.com:26medias/Quant-Studio-Demo-App.git



Install [https://www.npmjs.com/package/http-server](http-server) to run your app locally:

	npm install http-server

Then `cd` into the app's directory and in your console:

	http-server

Now your app is running locally on port `8080` and you're ready to install it on your project!

![](https://i.imgur.com/r4iIgro.png)

If you are using another local server to serve your page locally, make sure you listen to port `8080`.



## Installing the app on your project

On the right side of your project, click the `+` sign to display the App Store.

Click *Community* and install **localhost (dev app)**:

![](https://i.imgur.com/Qi56UWc.png)


Once installed, if you have this repository running locally on port `8080`, you should see this:

![](https://i.imgur.com/c4AX5Fm.png)


Now drag a connection from any block, and the app will output the coordinates of the event:
![](https://i.imgur.com/q7Gi6wl.png)

The full data payload contains the start & end coordinates, as well as the distance & the connection's data (box id, port name, their connections, its settings, ...)

The app's code is in `/public/app/app.js`


## Basic SDK overview

### Init the SDK

If you need to actively engage with the project (update the project, update you app's settings, access the proejct's data or dataset), you need to wait for the SDK to connect to the app first:

	// Init the app when the SDK is loaded
	sdk.onInit(function() {
		console.log("App started");
		console.log("Project Data:", sdk.data['project']);
		console.log("Datasets:", sdk.data['datasets']);
	});
	

You can request a callback whenever the dataset is updated or refreshed, along with a copy of the datasets:
	
	sdk.onDatasetUpdate(function(datasets) {
		console.log(datasets);
	});

You can request a callback whenever the project is modified, along with a copy of the new project data:

	sdk.onProjectChange(function(datasets) {
		output("Project update received", datasets);
	});

If you want to support drag & drop, or want to get notified of every ongoing connection between blocks, you can use the `onDrag` method:

	sdk.onDrag(function(eventType, data) {
		switch (eventType) {
			case "start":
				console.log("[drag] Started -> "+data.data.box+':'+data.data.id, data);
			break;
			case "move":
				if (data.end.left > 0 && data.end.top > 0) {
					console.log("[drag] Hover ("+data.end.left+";"+data.end.top+") -> "+data.data.box+':'+data.data.id, data);
				} else {
					console.log("[drag] Moving ("+data.end.left+";"+data.end.top+") -> "+data.data.box+':'+data.data.id, data);
				}
			break;
			case "end":
				if (data.end.left > 0 && data.end.top > 0) {
					// Access the dataset for that box, from the datasets the SDK obtained from the project:
					var dataset = sdk.data['datasets'][data.data.box];
					// Filter the ports, keep only the date and that port:
					var filtered = _.map(dataset, function(item) {
						var obj = {
							d:	item.d	// Keep the date
						};
						// Keep the port that was dragged, renamed it with the column name
						obj[data.data.label] = item[data.data.box+':'+data.data.id]; // keep the property "boxId:portId"
						return obj;
					});
					console.log("Data output from that port: ... "+_.pluck(filtered.slice(-5), data.data.label).join(' / '));
				} else {
					console.log("[drag] Ended outside the app -> "+data.data.box+':'+data.data.id, data);
				}
			break;
		}
		
	});
