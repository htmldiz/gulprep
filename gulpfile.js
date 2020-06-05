var autoprefixer = require('gulp-autoprefixer')
var browserSync = require('browser-sync')
var changed = require('gulp-changed')
var cssnano = require('gulp-cssnano')
var del = require('del')
var gulp = require('gulp')
var gulpIf = require('gulp-if')
var imagemin = require('gulp-imagemin')
var imageminJpegRecompress = require('imagemin-jpeg-recompress');
var purifycss = require('gulp-purifycss');
var runSequence = require('gulp4-run-sequence')
var sass = require('gulp-sass')
var sourcemaps = require('gulp-sourcemaps')
var uglify = require('gulp-uglify')
var useref = require('gulp-useref')
var rewritedep = require('./helpfilegulp/rewritedep/rewritedep').stream
var packageFile = require('./package.json')
var flatten = require('gulp-flatten')
var file = require('gulp-file')
var foreach = require("gulp-foreach");
var devPaths = {
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
var distPaths = {
  root: 'dist/',
  css: 'dist/css/',
  scripts: 'dist/js/',
  images: 'dist/img/',
  fonts: 'dist/fonts/',
  html: 'dist/',
  footerFolder: 'dist/'
}
var flags = {
  production: false
}

// Development Tasks 
// -----------------
// Start browserSync server
gulp.task('browserSync', function() {
  browserSync({
    server: {
      baseDir: "src/",
      routes: {"/node_modules": "node_modules"}
    }
  })
})
// Sass convert
gulp.task('sass', function() {
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
})
// Automatically inject Less and Sass npmdep dependencies
// gulp.task('npmdepStyles', function () {
//   dependenciesLength = packageFile.dependencies.length;
//   dependencies = packageFile.dependencies;
//   for (var index in dependencies) {
//     console.log(devPaths.nodeFolder+index+' ');
//     gulp.src(devPaths.nodeFolder+index+'**/scss/*.{sass,scss}')
//     .pipe(foreach(function(content, file) {
//     }))
//     .pipe(gulp.dest(devPaths.scss))
//   }
// })
gulp.task('npmdepStyles', function () {
  return gulp.src(devPaths.allCss)
    .pipe(rewritedep())
    .pipe(gulp.dest(devPaths.scss))
})
// Automatically inject js
// gulp.task('npmdepScripts', function () {
//   dependenciesLength = packageFile.dependencies.length;
//   dependencies = packageFile.dependencies;
//   for (var index in dependencies) {
//     gulp.src(devPaths.nodeFolder+index+'**/dist/'+index+'.{.min.js}')
//     .pipe(flatten())
//     .pipe(gulp.dest(devPaths.footerFolder))
//   }
// })
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
gulp.task('watch', function() {
  gulp.watch(devPaths.scss + '**/*.scss', ['sass'])
  gulp.watch(devPaths.scripts + '**/*.js', browserSync.reload)
  gulp.watch(devPaths.html + '**/*.html', browserSync.reload)
  gulp.watch(['package.json'], ['npmdep'])
})


// Production Tasks
// -----------------
//Clean before production
gulp.task('clean:dist', function() {
  return del.sync(distPaths.root);
})
// Contcatenation scripts
gulp.task('useref', function() {
  return gulp.src(devPaths.footerTpl)
    .pipe(useref())
    .pipe(gulpIf('*.js', uglify()))
    .pipe(gulpIf('*.css', cssnano()))
    .pipe(gulp.dest(distPaths.footerFolder));
})
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
gulp.task('default', function(callback) {
  runSequence(['npmdep','sass', 'browserSync'], 'watch',
    callback
  )
})
gulp.task('build', function(callback) {
  flags.production = true
  runSequence(
    'clean:dist',
    'sass',
    ['useref', 'images', 'fonts', "move_css"],
    callback
  )
})