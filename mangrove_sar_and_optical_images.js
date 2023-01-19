var s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED');
var imgVV = ee.ImageCollection('COPERNICUS/S1_GRD')
        .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
        .filter(ee.Filter.eq('instrumentMode', 'IW'))
        .select('VV')
        //.filterBounds(area_trabalho)
        .map(function(image) {
          var edge = image.lt(-30.0);
          var maskedImage = image.mask().and(edge.not());
          return image.updateMask(maskedImage);
        });

var desc = imgVV.filter(ee.Filter.eq('orbitProperties_pass', 'DESCENDING'));

var year = ee.Filter.date('2022-01-01', '2022-12-30'); 

var descChange = ee.Image.cat(
        desc.filter(year).mean());
        
var gcp = mangue.merge(nao_mangue)


Map.setCenter(-47.93,-24.99, 10);
Map.addLayer(descChange.clip(geometry), {min: -12, max: 5}, 'Multi-T Mean DESC', true);

Map.centerObject(geometry);

var rgbVis = {
  min: 0.0,
  max: 3000,
  bands: ['B4', 'B3', 'B2'],
};
// Function to remove cloud and snow pixels from Sentinel-2 SR image

function maskCloudAndShadowsSR(image) {
  var cloudProb = image.select('MSK_CLDPRB');
  var snowProb = image.select('MSK_SNWPRB');
  var cloud = cloudProb.lt(10);
  var scl = image.select('SCL'); 
  var shadow = scl.eq(3); // 3 = cloud shadow
  var cirrus = scl.eq(10); // 10 = cirrus
  // Cloud probability less than 10% or cloud shadow classification
  var mask = cloud.and(cirrus.neq(1)).and(shadow.neq(1));
  return image.updateMask(mask);
}


var filtered = s2
.filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 30))
  .filter(ee.Filter.date('2022-01-01', '2022-12-30'))
  .filter(ee.Filter.bounds(geometry))
  .map(maskCloudAndShadowsSR)
  .select('B.*');

var composite = filtered.median().clip(geometry);


var addIndices = function(image) {
  var ndvi = image.normalizedDifference(['B8', 'B4']).rename(['ndvi']);
  var ndbi = image.normalizedDifference(['B11', 'B8']).rename(['ndbi']);
  var mndwi = image.normalizedDifference(['B3', 'B11']).rename(['mndwi']); 
  var bsi = image.expression(
      '(( X + Y ) - (A + B)) /(( X + Y ) + (A + B)) ', {
        'X': image.select('B11'), //swir1
        'Y': image.select('B4'),  //red
        'A': image.select('B8'), // nir
        'B': image.select('B2'), // blue
  }).rename('bsi');
  return image.addBands(ndvi).addBands(ndbi).addBands(mndwi).addBands(bsi);
};

var composite = addIndices(composite);


var sar = descChange.select('VV').rename('S1');

var composite = composite.addBands(sar);
print(composite, 'composite')

var visParams = {bands: ['B4', 'B3', 'B2'], min: 0, max: 3000, gamma: 1.2};
Map.addLayer(composite, visParams, 'RGB');

// Normalize the image 

//Machine learning algorithms work best on images when all features have
//the same range

//Function to Normalize Image
//Pixel Values should be between 0 and 1
//Formula is (x - xmin) / (xmax - xmin)
//************************************************************************** 
// function normalize(image){
//   var bandNames = image.bandNames();
//   // Compute min and max of the image
//   var minDict = image.reduceRegion({
//     reducer: ee.Reducer.min(),
//     geometry: geometry,
//     scale: 10,
//     maxPixels: 1e9,
//     bestEffort: true,
//     tileScale: 16
//   });
//   var maxDict = image.reduceRegion({
//     reducer: ee.Reducer.max(),
//     geometry: geometry,
//     scale: 10,
//     maxPixels: 1e9,
//     bestEffort: true,
//     tileScale: 16
//   });
//   var mins = ee.Image.constant(minDict.values(bandNames));
//   var maxs = ee.Image.constant(maxDict.values(bandNames));

//   var normalized = image.subtract(mins).divide(maxs.subtract(mins));
//   return normalized;
// }

// var composite = normalize(composite);
// print(composite, 'composite')
// Add a random column and split the GCPs into training and validation set
var gcp = gcp.randomColumn();

// This being a simpler classification, we take 60% points
// for validation. Normal recommended ratio is
// 70% training, 30% validation
var trainingGcp = gcp.filter(ee.Filter.lt('random', 0.6));
var validationGcp = gcp.filter(ee.Filter.gte('random', 0.6));

// Overlay the point on the image to get training data.
var training = composite.sampleRegions({
  collection: trainingGcp,
  properties: ['landcover'],
  scale: 10,
  tileScale: 16
});
print(training);

// Train a classifier.
var classifier = ee.Classifier.smileRandomForest(50)
.train({
  features: training,  
  classProperty: 'landcover',
  inputProperties: composite.bandNames()
});

// Classify the image.
var classified = composite.classify(classifier);

Map.addLayer(classified, {min: 0, max: 1, palette: ['green', 'black']}, '2022');

//************************************************************************** 
// Accuracy Assessment
//************************************************************************** 

// Use classification map to assess accuracy using the validation fraction
// of the overall training set created above.
var test = classified.sampleRegions({
  collection: validationGcp,
  properties: ['landcover'],
  scale: 10,
  tileScale: 16
});

var testConfusionMatrix = test.errorMatrix('landcover', 'classification');

// Printing of confusion matrix may time out. Alternatively, you can export it as CSV
print('Confusion Matrix', testConfusionMatrix);
print('Test Accuracy', testConfusionMatrix.accuracy());


var ndviComposite = composite.select('ndvi').clip(geometry);
var ndbiComposite = composite.select('ndbi').clip(geometry);
var mndwiComposite = composite.select('mndwi').clip(geometry);

// var palette = [
//   'FFFFFF', 'CE7E45', 'DF923D', 'F1B555', 'FCD163', '99B718',
//   '74A901', '66A000', '529400', '3E8601', '207401', '056201',
//   '004C00', '023B01', '012E01', '011D01', '011301'];

var palette = ['green', 'white']
var palette_mndwi = ['white', 'blue']
var palette_ndbi = ['green', 'white']

var ndviVis = {min:0, max:1, palette: palette };
var ndbiVis = {min:-1, max:0.5, palette: palette_ndbi};
var mndwiVis = {min:-1, max:0.5, palette: palette_mndwi};
Map.addLayer(ndviComposite, ndviVis, 'ndvi');
Map.addLayer(ndbiComposite, ndbiVis, 'ndbi');
Map.addLayer(mndwiComposite, mndwiVis, 'mndwi');