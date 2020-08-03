const fs = require("fs");
const path = require("path");
const imageAverageColour = require("image-average-colour");
const watch = require('node-watch');
const DeltaE = require('delta-e');
const resizeImg = require('resize-img');
const mergeImages = require('merge-images');
const { Canvas, Image } = require('canvas');
const exec = require('child_process').exec;


!fs.existsSync(`./output/`) && fs.mkdirSync(`./output/`, { recursive: true })
!fs.existsSync(`./finalimg/`) && fs.mkdirSync(`./finalimg/`, { recursive: true })



const output = path.join(__dirname, "./output");


const avgRGB = [];

async function processImg(img){

      // 1 get avg of whole image first
      var avgRGB = await imageAverageColour(img)
      console.log('1 - Average RGB of whole image is :',avgRGB.rgb,'\n2 -Then sliced into parts and Average RGB calculated for each part.')
      const avgWholeImageArr = [avgRGB.red,avgRGB.green,avgRGB.blue]



      // // 2 - slices image into parts
      var cmd =  'convert '+ img  + ' -crop 3x3-20-20@ +repage +adjoin ./output/tile-%d.jpg'

      const child = await exec(cmd,(error, stdout, stderr) => {

              console.log('sliced images into 20x20 parts ');

      });






      // 3 -  get average of all parts of img
      const objDeltaDiffs = {}
      await watch('./output', { recursive: true }, async function(evt, name) {
          if (evt == 'update') {

                var avgPartImg = await imageAverageColour(name)
                var altArr = [avgPartImg.red,avgPartImg.green,avgPartImg.blue]
                console.log('rgb for ',name,' is ',altArr);


                // 4 calculate distance for all parts..
                // console.log('whole avgWholeImageArr',avgWholeImageArr);
                var color1 = {L: altArr[0], A: altArr[1], B: altArr[2]};
                var color2 = {L: avgWholeImageArr[0], A: avgWholeImageArr[1], B: avgWholeImageArr[2]};


                var delta = DeltaE.getDeltaE76(color1, color2)
                // console.log(delta);

                objDeltaDiffs[name] = delta


          }

          // console.log('objDeltaDiffs',objDeltaDiffs)

      });


     // 5 Choose the tiles with the smallest distance, resize
     setTimeout(async function(){

        console.log('objDeltaDiffs',objDeltaDiffs)

        let smallestDistance = Object.keys(objDeltaDiffs).reduce((key, v) => objDeltaDiffs[v] < objDeltaDiffs[key] ? v : key);
        console.log('\n\nsmallestDistance is:',smallestDistance);


        const image = await resizeImg(fs.readFileSync(smallestDistance), {
            width: 80,
            height: 80
        });

        // var outfile = smallestDistance.replace('output','finalimg')

        fs.writeFileSync( smallestDistance, image);
        console.log('\nsmallest part of image resized and is',smallestDistance,'\n');



        // replace resized image into full images
        var imageNames = Object.keys(objDeltaDiffs);

        console.log('imagenames',imageNames);
        var joinImages  = imageNames.join(' ')
        console.log('join',joinImages);


         var cmd = 'montage '+  joinImages +' -tile 3x3 -geometry +10+10 ./finalimg/finalImage.jpg';

         const child = exec(cmd,(error, stdout, stderr) => {

                 console.log('Resized and replaced the image. Final output Image is in ./finalimg folder. ');

                 console.log("Done!");
                 process.exit()
         });


     }, 1000);


}


const img =  "./images/image_0002.jpg";

processImg(img)
