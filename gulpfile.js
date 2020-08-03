const autoprefixer = require('gulp-autoprefixer')
const browserSync = require('browser-sync').create();
const changed = require('gulp-changed')
const cssnano = require('gulp-cssnano')
const del = require('del')
const gulp = require('gulp')
const fs = require('fs')
const gulpIf = require('gulp-if')
const imagemin = require('gulp-imagemin')
const imageminJpegRecompress = require('imagemin-jpeg-recompress');
const purifycss = require('gulp-purifycss');
const runSequence = require('gulp4-run-sequence')
const sass = require('gulp-sass')
const sourcemaps = require('gulp-sourcemaps')
const uglify = require('gulp-uglify')
const useref = require('gulp-useref')
const rewritedep = require('./helpfilegulp/rewritedep/rewritedep').stream
const packageFile = require('./package.json')
const flatten = require('gulp-flatten')
const file = require('gulp-file')
const foreach = require("gulp-foreach");
const devPaths = {
  nodeFolder: 'node_modules/',
  allCss: 'src/scss/npmdep.scss',
  scss: 'src/scss/',
  css: 'src/css/',
  scripts: 'src/js/',
  images: 'src/img/*',
  fonts: 'src/fonts/',
  html: 'src/',
  footerFolder: 'src/',
  footerTpl: 'src/*.html'
}
const distPaths = {
  root: 'dist/',
  css: 'dist/css/',
  scripts: 'dist/js/',
  images: 'dist/img/',
  fonts: 'dist/fonts/',
  html: 'dist/',
  footerFolder: 'dist/'
}
const flags = {
  production: false
}
function removeDir(path) {
  if (fs.existsSync(path)) {
    const files = fs.readdirSync(path)
    if (files.length > 0) {
      files.forEach(function(filename) {
        var remove_obj = path + "/" + filename;
        remove_obj = remove_obj.replace(new RegExp('//','g'),'/');
        if (!fs.statSync(remove_obj).isDirectory()) {
          console.log(remove_obj);
          fs.unlinkSync(remove_obj);
        }
      })
    }
    console.log("Directory removed.");
  } else {
    console.log("Directory path not found.");
  }
  return true;
}
function sassChange() {
  return gulp.src(devPaths.scss + '**/*.scss')
    .pipe(gulpIf(!flags.production, sourcemaps.init()))
    .pipe(sass().on('error', sass.logError))
    .pipe(autoprefixer({ browsers: [
        'last 2 versions',
        'android 4',
        'opera 15'] }))
    .pipe(gulpIf(!flags.production, sourcemaps.write()))
    // .pipe(gulpIf(flags.production, purifycss([devPaths.html + '**/*.html'])))
    .pipe(changed(devPaths.css, { hasChanged: changed.compareSha1Digest }))
    .pipe(gulp.dest(devPaths.css))
    .pipe(browserSync.reload({
      stream: true
    }))
}

gulp.task('npmdepStyles', function () {
  return gulp.src(devPaths.allCss)
    .pipe(rewritedep())
    .pipe(gulp.dest(devPaths.scss))
})

gulp.task('npmdepScripts', function () {
  return gulp.src(devPaths.footerTpl)
    .pipe(rewritedep())
    .pipe(gulp.dest(devPaths.footerFolder))
})

// Copy-paste fontawesome
gulp.task('fonts', function() {
  dependenciesLength = packageFile.dependencies.length;
  dependencies = packageFile.dependencies;
  for (var index in dependencies) {
    gulp.src(devPaths.nodeFolder+index+'**/fonts/*.{otf,ttf,woff,woff2}')
    .pipe(flatten())
    .pipe(gulp.dest(devPaths.fonts))
  }
})
// npmdep tasks
gulp.task('npmdep', function(callback) {
  runSequence('npmdepStyles', 'npmdepScripts', 'fonts',
    callback
  )
})
// Watchers
function watchChange() {
  browserSync.init({
    server: {
      baseDir: "src/",
      routes: {"/node_modules": "node_modules"}
    }
  })
  gulp.watch(devPaths.scss + '**/*.scss', sassChange)
  gulp.watch(devPaths.scripts + '**/*.js').on('change', browserSync.reload);
  gulp.watch(devPaths.html + '**/*.html').on('change', browserSync.reload);
  // gulp.watch(['package.json'], ['npmdep'])
}


// Production Tasks
// -----------------
//Clean before production
// function clean_dist() {
//   return removeDir(distPaths.root);
// }
// Contcatenation scripts
function userefTask() {
  return gulp.src(devPaths.footerTpl)
    .pipe(useref())
    .pipe(gulpIf('*.js', uglify()))
    .pipe(gulpIf('*.css', cssnano()))
    .pipe(gulp.dest(distPaths.footerFolder));
}
// Optimizing Images
gulp.task('images', function() {
  return gulp.src(devPaths.images + '*')
    .pipe(imagemin([
      imagemin.gifsicle(),
      imageminJpegRecompress({
        loops:4,
        min: 50,
        max: 95,
        quality:'high'
      }),
      imagemin.optipng()
    ]))
    .pipe(gulp.dest(distPaths.images))
})

gulp.task('move_css', function() {
  return gulp.src(devPaths.css + '*.css')
  .pipe(gulp.dest(distPaths.css))
})

//Default task - dev
function defaultRun(callback) {
  runSequence(['watch'],
    callback
  )
}
gulp.task('build', function(callback) {
  flags.production = true;
  removeDir(distPaths.root);
  runSequence(
      userefTask,
    sassChange,
    ['images', 'fonts', "move_css"],
    callback
  )
})
exports.watch = watchChange;
exports.default = watchChange;