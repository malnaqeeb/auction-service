terraform {
  required_providers {
    aws = {
      source = "hashicorp/aws"
    }
  }
  required_version = ">= 0.13"
  backend "s3" {
    bucket = "terraform-state"
    key    =   "my-terraform-project"
    region = "eu-west-1"
  }
}
