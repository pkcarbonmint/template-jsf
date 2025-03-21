# Template Generator Performance Optimization

This document explains the performance optimizations implemented to improve the template generation process, particularly when working with hundreds of JSON schemas.

## Problem

The standard template generator processes schemas sequentially, which can be slow when handling a large number of schemas. This can lead to significant wait times during development or build processes.

## Solution

We implemented a parallel processing approach using Node.js worker threads to distribute the workload across multiple CPU cores. This significantly improves performance by utilizing system resources more efficiently.

## Implementation

The implementation consists of:

1. **Batch Processing Script (`batchGenerate.js`)**: 
   - Divides schemas into batches
   - Creates worker threads to process batches in parallel
   - Manages worker lifecycle and tracks progress
   - Configurable batch size and worker count
   - Compiles TypeScript files before starting workers

2. **Worker Implementation (`templateWorker.js`)**:
   - Processes schema batches in separate threads
   - Directly uses the compiled template generator modules
   - Implements schema caching to avoid redundant parsing
   - Reports progress back to the main thread

3. **TypeScript Compilation**:
   - Dedicated TypeScript config for CLI components (`tsconfig.cli.json`)
   - Pre-compilation step to optimize worker performance
   - Eliminates the need for runtime TypeScript compilation in workers

## Optimizations

1. **Direct Module Usage**:
   - Workers import compiled JavaScript modules directly
   - Eliminates the overhead of spawning separate processes
   - Reduces memory usage and improves startup time

2. **Schema Caching**:
   - Each worker maintains a cache of parsed schemas
   - Avoids redundant parsing of the same schema
   - Significantly improves performance for batch operations

3. **Parallel Processing**:
   - Multiple worker threads process schemas concurrently
   - Each worker handles a batch of schemas
   - Dynamically starts new workers as batches complete

## Usage

To use the parallel template generator:

```bash
pnpm batch-generate [options]
```

Options:
- `-s, --schema-dir <dir>`: Directory containing JSON schemas (default: "src/test-schemas")
- `-o, --output-dir <dir>`: Output directory for generated templates (default: "test-output")
- `-b, --batch-size <size>`: Number of schemas per batch (default: 10)
- `-w, --max-workers <count>`: Maximum number of worker threads (default: CPU count)
- `-t, --templates-dir <dir>`: Directory containing Mustache templates (default: "src/template-generator/templates")

## Performance Considerations

1. **Batch Size**: 
   - Smaller batches provide better load distribution but increase overhead
   - Larger batches reduce overhead but might lead to uneven workload distribution
   - The optimal batch size depends on the schema complexity and system resources

2. **Worker Count**:
   - By default, uses the number of CPU cores available
   - Increasing beyond CPU count typically doesn't improve performance
   - Consider leaving some cores free for other system processes

3. **Memory Usage**:
   - Each worker requires memory to parse and process schemas
   - Schema caching reduces redundant operations but increases memory usage
   - Monitor memory usage when processing large schemas
   - Reduce worker count if memory becomes a constraint

## Example Performance Gain

Testing with 5 schemas on a system with 4 CPU cores:

- Sequential processing: ~12 seconds
- Parallel processing (4 workers): ~5 seconds
- Direct module usage vs. process spawning: ~30% faster

The performance benefit becomes more significant with larger numbers of schemas.

## Further Optimization Opportunities

1. **Shared Schema Cache**: Implement a shared schema cache across workers using shared memory
2. **Schema Complexity Analysis**: Distribute schemas based on complexity rather than count
3. **Progressive Output**: Generate high-priority templates first
4. **Incremental Processing**: Only generate templates for changed schemas 