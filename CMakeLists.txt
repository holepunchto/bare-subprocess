cmake_minimum_required(VERSION 3.25)

project(bare_subprocess C)

include(bare)

add_bare_module(bare_subprocess)

target_sources(
  ${bare_subprocess}
  PRIVATE
    binding.c
)
