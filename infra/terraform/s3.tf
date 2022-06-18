resource "aws_s3_bucket" "simple_bucket" {
  bucket = "my-own-project"
  acl    = "private"

  tags = {
    Name = "terraform-state"
  }
}
