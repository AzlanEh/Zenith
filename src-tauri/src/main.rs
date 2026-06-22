// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::env;

fn main() {
    let args: Vec<String> = env::args().collect();

    // Check for --background flag for headless mode
    if args.contains(&"--background".to_string()) || args.contains(&"-b".to_string()) {
        zenith_lib::run_background();
    } else {
        zenith_lib::run();
    }
}
