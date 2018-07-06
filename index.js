'use strict';

/*global require,window */

var configuration = {
    bingMapsKey: undefined, // use Cesium key
};

// Check browser compatibility early on.
// A very old browser (e.g. Internet Explorer 8) will fail on requiring-in many of the modules below.
// 'ui' is the name of the DOM element that should contain the error popup if the browser is not compatible
//var checkBrowserCompatibility = require('terriajs/lib/ViewModels/checkBrowserCompatibility');

// checkBrowserCompatibility('ui');
import React from 'react';
import defined from 'terriajs-cesium/Source/Core/defined';
import GoogleAnalytics from 'terriajs/lib/Core/GoogleAnalytics';
import ShareDataService from 'terriajs/lib/Models/ShareDataService';
import raiseErrorToUser from 'terriajs/lib/Models/raiseErrorToUser';
import registerAnalytics from 'terriajs/lib/Models/registerAnalytics';
import registerCatalogMembers from 'terriajs/lib/Models/registerCatalogMembers';
import registerCustomComponentTypes from 'terriajs/lib/ReactViews/Custom/registerCustomComponentTypes';
import Terria from 'terriajs/lib/Models/Terria';
import updateApplicationOnHashChange from 'terriajs/lib/ViewModels/updateApplicationOnHashChange';
import updateApplicationOnMessageFromParentWindow from 'terriajs/lib/ViewModels/updateApplicationOnMessageFromParentWindow';
import ViewState from 'terriajs/lib/ReactViewModels/ViewState';
import BingMapsSearchProviderViewModel from 'terriajs/lib/ViewModels/BingMapsSearchProviderViewModel.js';
import GazetteerSearchProviderViewModel from 'terriajs/lib/ViewModels/GazetteerSearchProviderViewModel.js';
import GnafSearchProviderViewModel from 'terriajs/lib/ViewModels/GnafSearchProviderViewModel.js';
import render from './lib/Views/render';
import WebProcessingServiceCatalogFunction from 'terriajs/lib/Models/WebProcessingServiceCatalogFunction';
import ParameterEditor from 'terriajs/lib/ReactViews/Analytics/ParameterEditor';
import geoJsonParameterConverter from './lib/CustomParameters/geoJsonParameterConverter';
import GeoJsonParameterEditor from './lib/Views/GeoJsonParameterEditor';
import SelectAPolygonParameterEditor from './lib/Views/SelectAPolygonParameterEditor';

// Tell the OGR catalog item where to find its conversion service.  If you're not using OgrCatalogItem you can remove this.
OgrCatalogItem.conversionServiceBaseUrl = configuration.conversionServiceBaseUrl;
WebProcessingServiceCatalogFunction.parameterConverters.push(geoJsonParameterConverter());

ParameterEditor.parameterTypeConverters.push({
    id: 'geojson',
    parameterTypeToDiv: function GeoJsonParameterToDiv(type, parameterEditor) {
        if (type === this.id) {
            return (<div>
                        {parameterEditor.renderLabel()}
                         <GeoJsonParameterEditor
                            previewed={parameterEditor.props.previewed}
                            viewState={parameterEditor.props.viewState}
                            parameter={parameterEditor.props.parameter}
                         />
                    </div>);
        }
    }
});

// Register all types of catalog members in the core TerriaJS.  If you only want to register a subset of them
// (i.e. to reduce the size of your application if you don't actually use them all), feel free to copy a subset of
// the code in the registerCatalogMembers function here instead.
registerCatalogMembers();
registerAnalytics();

// Construct the TerriaJS application, arrange to show errors to the user, and start it up.
var terria = new Terria({
    appName: "GEOGLAM RAPP",
    supportEmail: "geoglam.rapp@csiro.au",
    baseUrl: "build/TerriaJS",
    cesiumBaseUrl: undefined, // for default
    analytics: new GoogleAnalytics()
});

// Register custom components in the core TerriaJS.  If you only want to register a subset of them, or to add your own,
// insert your custom version of the code in the registerCustomComponentTypes function here instead.
registerCustomComponentTypes(terria);

// Create the ViewState before terria.start so that errors have somewhere to go.
const viewState = new ViewState({
    terria: terria
});

if (process.env.NODE_ENV === "development") {
    window.viewState = viewState;
}

// If we're running in dev mode, disable the built style sheet as we'll be using the webpack style loader.
// Note that if the first stylesheet stops being nationalmap.css then this will have to change.
if (process.env.NODE_ENV !== "production" && module.hot) {
    document.styleSheets[0].disabled = true;
}

terria.start({
    // If you don't want the user to be able to control catalog loading via the URL, remove the applicationUrl property below
    // as well as the call to "updateApplicationOnHashChange" further down.
    applicationUrl: window.location,
    configUrl: 'config.json',
    defaultTo2D: true,
    shareDataService: new ShareDataService({
        terria: terria
    })
}).otherwise(function(e) {
    raiseErrorToUser(terria, e);
}).always(function() {
    try {
        viewState.searchState.locationSearchProviders = [
            new BingMapsSearchProviderViewModel({
                terria: terria,
                key: terria.configParameters.bingMapsKey
            }),
            new GazetteerSearchProviderViewModel({terria}),
            new GnafSearchProviderViewModel({terria})
        ];

        // Automatically update Terria (load new catalogs, etc.) when the hash part of the URL changes.
        updateApplicationOnHashChange(terria, window);
        updateApplicationOnMessageFromParentWindow(terria, window);

        // Create the various base map options.
        var createGlobalBaseMapOptions = require('./lib/ViewModels/createGlobalBaseMapOptions');
        var selectBaseMap = require('terriajs/lib/ViewModels/selectBaseMap');
        var globalBaseMaps = createGlobalBaseMapOptions(terria, configuration.bingMapsKey);

        selectBaseMap(terria, globalBaseMaps, 'Positron (Light)', false);

        // Add the disclaimer, if specified
        if (defined(terria.configParameters.globalDisclaimer)) {
            var disclaimer = terria.configParameters.globalDisclaimer;
            var message = '';
            message += require('./lib/Views/GlobalDisclaimer.html');
            var options = {
                title: 'GEOGLAM RAPP Map',
                confirmText: 'Continue',
                width: 600,
                height: 550,
                message: message
            };

            viewState.notifications.push(options);
        }

        render(terria, globalBaseMaps, viewState);
    } catch (e) {
        console.error(e);
        console.error(e.stack);
    }
});
