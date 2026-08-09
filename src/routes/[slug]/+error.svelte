<script lang="ts">
	import { page } from '$app/state';
</script>

<div class="error">
	<h1>Site not found</h1>
	<p>{page.error?.message ?? 'Site not found'}</p>
	<a href="/">← Back to all sites</a>
</div>

<style>
	.error {
		text-align: center;
		padding: 2rem;
	}
</style>
